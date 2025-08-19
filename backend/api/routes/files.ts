import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import { promisify } from 'util';

// 扩展Request接口以包含file属性
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

const router = express.Router();
const execAsync = promisify(exec);

// 配置multer用于文件上传
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedExtensions = ['.csv', '.parquet'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件格式: ${fileExtension}`));
    }
  }
});

// 文件存储目录
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const TEMP_DIR = path.join(process.cwd(), 'temp');

// 确保目录存在
const ensureDirectories = async () => {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.mkdir(TEMP_DIR, { recursive: true });
  } catch (error) {
    console.error('创建目录失败:', error);
  }
};

ensureDirectories();

// 文件信息接口
interface FileInfo {
  id: string;
  original_filename: string;
  filename: string;
  file_type: string;
  file_size: number;
  upload_time: string;
  status: 'uploading' | 'validating' | 'success' | 'error';
  progress: number;
  error?: string;
  validation_report?: any;
  preview_data?: any;
}

// 内存中的文件存储（生产环境应使用数据库）
const fileStore = new Map<string, FileInfo>();

// 调用Python验证服务
const validateFile = async (filePath: string): Promise<any> => {
  try {
    const pythonScript = `
import sys
import json
sys.path.append('${path.join(process.cwd(), 'api', 'services').replace(/\\/g, '/')}')
from file_validator import validate_file, ValidationLevel

result = validate_file('${filePath.replace(/\\/g, '/')}', validation_level=ValidationLevel.CONTENT)

# 转换为可序列化的格式
report = {
    'file_path': result.file_path,
    'file_size': result.file_size,
    'file_type': result.file_type,
    'encoding': result.encoding,
    'is_valid': result.is_valid,
    'validation_results': [
        {
            'is_valid': r.is_valid,
            'severity': r.severity.value,
            'code': r.code,
            'message': r.message,
            'field': r.field,
            'expected': r.expected,
            'actual': r.actual,
            'suggestions': r.suggestions
        } for r in result.validation_results
    ],
    'metadata': result.metadata
}

print(json.dumps(report, default=str))
`;

    const { stdout, stderr } = await execAsync(`python -c "${pythonScript}"`);
    
    if (stderr) {
      console.error('Python validation error:', stderr);
      throw new Error(`验证失败: ${stderr}`);
    }
    
    return JSON.parse(stdout);
  } catch (error) {
    console.error('文件验证失败:', error);
    throw error;
  }
};

// 生成预览数据
const generatePreview = async (filePath: string, fileType: string): Promise<any> => {
  try {
    const pythonScript = `
import pandas as pd
import json

try:
    if '${fileType}' == 'csv':
        df = pd.read_csv('${filePath.replace(/\\/g, '/')}')
    elif '${fileType}' == 'parquet':
        df = pd.read_parquet('${filePath.replace(/\\/g, '/')}')
    else:
        raise ValueError('Unsupported file type')
    
    # 生成预览数据
    preview = {
        'columns': df.columns.tolist(),
        'dtypes': df.dtypes.astype(str).to_dict(),
        'shape': df.shape,
        'head': df.head(10).to_dict('records'),
        'summary': {
            'total_rows': len(df),
            'total_columns': len(df.columns),
            'null_counts': df.isnull().sum().to_dict(),
            'memory_usage': df.memory_usage(deep=True).sum()
        }
    }
    
    print(json.dumps(preview, default=str))
except Exception as e:
    print(json.dumps({'error': str(e)}))
`;

    const { stdout, stderr } = await execAsync(`python -c "${pythonScript}"`);
    
    if (stderr) {
      console.error('Python preview error:', stderr);
    }
    
    const result = JSON.parse(stdout);
    if (result.error) {
      throw new Error(result.error);
    }
    
    return result;
  } catch (error) {
    console.error('生成预览失败:', error);
    return null;
  }
};

// POST /api/files/upload - 文件上传
router.post('/upload', upload.single('file'), async (req: MulterRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '没有上传文件'
      });
    }

    const fileId = uuidv4();
    const originalName = req.file.originalname;
    const fileExtension = path.extname(originalName).toLowerCase();
    const fileName = `${fileId}${fileExtension}`;
    const filePath = path.join(UPLOAD_DIR, fileName);
    
    // 创建文件信息
    const fileInfo: FileInfo = {
      id: fileId,
      original_filename: originalName,
      filename: fileName,
      file_type: fileExtension.substring(1), // 去掉点号
      file_size: req.file.size,
      upload_time: new Date().toISOString(),
      status: 'uploading',
      progress: 0
    };
    
    fileStore.set(fileId, fileInfo);
    
    // 保存文件
    await fs.writeFile(filePath, req.file.buffer);
    
    // 更新状态为验证中
    fileInfo.status = 'validating';
    fileInfo.progress = 50;
    fileStore.set(fileId, fileInfo);
    
    // 异步进行文件验证和预览生成
    setImmediate(async () => {
      try {
        // 文件验证
        const validationReport = await validateFile(filePath);
        fileInfo.validation_report = validationReport;
        
        if (!validationReport.is_valid) {
          fileInfo.status = 'error';
          fileInfo.error = '文件验证失败';
          fileInfo.progress = 0;
        } else {
          // 生成预览
          const previewData = await generatePreview(filePath, fileInfo.file_type);
          fileInfo.preview_data = previewData;
          fileInfo.status = 'success';
          fileInfo.progress = 100;
        }
        
        fileStore.set(fileId, fileInfo);
      } catch (error) {
        console.error('文件处理失败:', error);
        fileInfo.status = 'error';
        fileInfo.error = error instanceof Error ? error.message : '处理失败';
        fileInfo.progress = 0;
        fileStore.set(fileId, fileInfo);
      }
    });
    
    res.json({
      success: true,
      data: {
        id: fileId,
        original_filename: originalName,
        file_type: fileInfo.file_type,
        file_size: req.file.size,
        upload_time: fileInfo.upload_time,
        status: 'uploading'
      }
    });
    
  } catch (error) {
    console.error('文件上传失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '上传失败'
    });
  }
});

// GET /api/files - 获取文件列表
router.get('/', (req: Request, res: Response) => {
  try {
    const files = Array.from(fileStore.values()).map(file => ({
      id: file.id,
      original_filename: file.original_filename,
      filename: file.filename,
      file_type: file.file_type,
      file_size: file.file_size,
      upload_time: file.upload_time,
      status: file.status,
      progress: file.progress,
      error: file.error
    }));
    
    res.json({
      success: true,
      data: {
        files,
        total: files.length
      }
    });
  } catch (error) {
    console.error('获取文件列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取文件列表失败'
    });
  }
});

// GET /api/files/:id - 获取文件信息
router.get('/:id', (req: Request, res: Response) => {
  try {
    const fileId = req.params.id;
    const fileInfo = fileStore.get(fileId);
    
    if (!fileInfo) {
      return res.status(404).json({
        success: false,
        error: '文件不存在'
      });
    }
    
    res.json({
      success: true,
      data: fileInfo
    });
  } catch (error) {
    console.error('获取文件信息失败:', error);
    res.status(500).json({
      success: false,
      error: '获取文件信息失败'
    });
  }
});

// GET /api/files/:id/preview - 获取文件预览
router.get('/:id/preview', (req: Request, res: Response) => {
  try {
    const fileId = req.params.id;
    const fileInfo = fileStore.get(fileId);
    
    if (!fileInfo) {
      return res.status(404).json({
        success: false,
        error: '文件不存在'
      });
    }
    
    if (fileInfo.status !== 'success') {
      return res.status(400).json({
        success: false,
        error: '文件尚未处理完成或处理失败'
      });
    }
    
    res.json({
      success: true,
      data: {
        preview: fileInfo.preview_data,
        validation: fileInfo.validation_report
      }
    });
  } catch (error) {
    console.error('获取文件预览失败:', error);
    res.status(500).json({
      success: false,
      error: '获取文件预览失败'
    });
  }
});

// DELETE /api/files/:id - 删除文件
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const fileId = req.params.id;
    const fileInfo = fileStore.get(fileId);
    
    if (!fileInfo) {
      return res.status(404).json({
        success: false,
        error: '文件不存在'
      });
    }
    
    // 删除物理文件
    const filePath = path.join(UPLOAD_DIR, fileInfo.filename);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.warn('删除物理文件失败:', error);
    }
    
    // 从存储中删除
    fileStore.delete(fileId);
    
    res.json({
      success: true,
      message: '文件删除成功'
    });
  } catch (error) {
    console.error('删除文件失败:', error);
    res.status(500).json({
      success: false,
      error: '删除文件失败'
    });
  }
});

// POST /api/files/:id/retry - 重试文件处理
router.post('/:id/retry', async (req: Request, res: Response) => {
  try {
    const fileId = req.params.id;
    const fileInfo = fileStore.get(fileId);
    
    if (!fileInfo) {
      return res.status(404).json({
        success: false,
        error: '文件不存在'
      });
    }
    
    // 重置状态
    fileInfo.status = 'validating';
    fileInfo.progress = 50;
    fileInfo.error = undefined;
    fileInfo.validation_report = undefined;
    fileInfo.preview_data = undefined;
    fileStore.set(fileId, fileInfo);
    
    // 重新处理文件
    const filePath = path.join(UPLOAD_DIR, fileInfo.filename);
    
    setImmediate(async () => {
      try {
        // 文件验证
        const validationReport = await validateFile(filePath);
        fileInfo.validation_report = validationReport;
        
        if (!validationReport.is_valid) {
          fileInfo.status = 'error';
          fileInfo.error = '文件验证失败';
          fileInfo.progress = 0;
        } else {
          // 生成预览
          const previewData = await generatePreview(filePath, fileInfo.file_type);
          fileInfo.preview_data = previewData;
          fileInfo.status = 'success';
          fileInfo.progress = 100;
        }
        
        fileStore.set(fileId, fileInfo);
      } catch (error) {
        console.error('文件重新处理失败:', error);
        fileInfo.status = 'error';
        fileInfo.error = error instanceof Error ? error.message : '处理失败';
        fileInfo.progress = 0;
        fileStore.set(fileId, fileInfo);
      }
    });
    
    res.json({
      success: true,
      message: '重试处理已开始',
      data: {
        id: fileId,
        status: fileInfo.status,
        progress: fileInfo.progress
      }
    });
  } catch (error) {
    console.error('重试文件处理失败:', error);
    res.status(500).json({
      success: false,
      error: '重试失败'
    });
  }
});

export default router;