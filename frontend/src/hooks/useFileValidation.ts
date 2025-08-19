import { useState, useCallback } from 'react';

// 验证错误类型定义
export interface ValidationError {
  type: 'size' | 'format' | 'name' | 'mime';
  code: string;
  message: string;
  field?: string;
  expected?: string;
  actual?: string;
  details?: any;
  suggestions?: string[];
}

// 验证结果类型定义
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings?: ValidationError[];
}

// Hook选项接口
export interface UseFileValidationOptions {
  maxFileSize?: number; // 最大文件大小（字节）
  acceptedTypes?: string[]; // 接受的文件类型
  allowedMimeTypes?: string[]; // 允许的MIME类型
}

// Hook返回值接口
export interface UseFileValidationReturn {
  validateFile: (file: File) => ValidationResult;
  validationErrors: ValidationError[];
  isValid: boolean;
  clearErrors: () => void;
}

// 默认配置
const DEFAULT_OPTIONS: Required<UseFileValidationOptions> = {
  maxFileSize: 100 * 1024 * 1024, // 100MB
  acceptedTypes: ['.csv', '.parquet'],
  allowedMimeTypes: [
    'text/csv',
    'application/csv',
    'application/octet-stream', // Parquet文件通常是这个MIME类型
    'application/parquet'
  ]
};

/**
 * 文件验证Hook
 * 提供前端文件验证功能，包括文件大小、格式、MIME类型等检查
 */
export const useFileValidation = (
  options: UseFileValidationOptions = {}
): UseFileValidationReturn => {
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isValid, setIsValid] = useState<boolean>(true);

  // 合并默认选项和用户选项
  const config = { ...DEFAULT_OPTIONS, ...options };

  // 清除错误
  const clearErrors = useCallback(() => {
    setValidationErrors([]);
    setIsValid(true);
  }, []);

  // 验证文件大小
  const validateFileSize = useCallback((file: File): ValidationError | null => {
    if (file.size > config.maxFileSize) {
      return {
        type: 'size',
        code: 'FILE_TOO_LARGE',
        message: `文件大小超过限制。当前: ${(file.size / 1024 / 1024).toFixed(2)}MB，最大: ${(config.maxFileSize / 1024 / 1024).toFixed(2)}MB`,
        details: {
          currentSize: file.size,
          maxSize: config.maxFileSize,
          currentSizeMB: (file.size / 1024 / 1024).toFixed(2),
          maxSizeMB: (config.maxFileSize / 1024 / 1024).toFixed(2)
        },
        suggestions: [
          '请压缩文件或选择较小的文件',
          '如果是CSV文件，可以尝试删除不必要的列或行',
          '联系管理员增加文件大小限制'
        ]
      };
    }
    return null;
  }, [config.maxFileSize]);

  // 验证文件扩展名
  const validateFileExtension = useCallback((file: File): ValidationError | null => {
    const fileName = file.name.toLowerCase();
    const hasValidExtension = config.acceptedTypes.some(type => 
      fileName.endsWith(type.toLowerCase())
    );

    if (!hasValidExtension) {
      return {
        type: 'format',
        code: 'INVALID_FILE_EXTENSION',
        message: `不支持的文件格式。当前: ${fileName.split('.').pop()?.toUpperCase()}，支持: ${config.acceptedTypes.join(', ')}`,
        details: {
          fileName,
          detectedExtension: fileName.split('.').pop(),
          acceptedTypes: config.acceptedTypes
        },
        suggestions: [
          `请选择 ${config.acceptedTypes.join(' 或 ')} 格式的文件`,
          '确保文件扩展名正确',
          '如果文件格式正确，请检查文件名是否包含正确的扩展名'
        ]
      };
    }
    return null;
  }, [config.acceptedTypes]);

  // 验证MIME类型
  const validateMimeType = useCallback((file: File): ValidationError | null => {
    if (!config.allowedMimeTypes.includes(file.type)) {
      return {
        type: 'mime',
        code: 'INVALID_MIME_TYPE',
        message: `文件类型不匹配。检测到: ${file.type || '未知'}，期望: ${config.allowedMimeTypes.join(', ')}`,
        details: {
          detectedMimeType: file.type,
          allowedMimeTypes: config.allowedMimeTypes
        },
        suggestions: [
          '请确保文件是真正的CSV或Parquet格式',
          '避免修改文件扩展名来伪造文件类型',
          '如果文件格式正确，可能是浏览器识别问题，请重试'
        ]
      };
    }
    return null;
  }, [config.allowedMimeTypes]);

  // 验证文件名
  const validateFileName = useCallback((file: File): ValidationError | null => {
    const fileName = file.name;
    
    // 检查文件名是否为空
    if (!fileName || fileName.trim().length === 0) {
      return {
        type: 'name',
        code: 'EMPTY_FILE_NAME',
        message: '文件名不能为空',
        suggestions: ['请选择有效的文件']
      };
    }

    // 检查文件名长度
    if (fileName.length > 255) {
      return {
        type: 'name',
        code: 'FILE_NAME_TOO_LONG',
        message: `文件名过长。当前: ${fileName.length} 字符，最大: 255 字符`,
        details: {
          currentLength: fileName.length,
          maxLength: 255
        },
        suggestions: ['请重命名文件，使用较短的文件名']
      };
    }

    // 检查文件名中的非法字符
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(fileName)) {
      return {
        type: 'name',
        code: 'INVALID_FILE_NAME_CHARS',
        message: '文件名包含非法字符。不允许使用: < > : " / \\ | ? *',
        details: {
          fileName,
          invalidChars: fileName.match(invalidChars)
        },
        suggestions: [
          '请重命名文件，移除特殊字符',
          '建议使用字母、数字、下划线和连字符'
        ]
      };
    }

    return null;
  }, []);

  // 主验证函数
  const validateFile = useCallback((file: File): ValidationResult => {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // 执行所有验证
    const sizeError = validateFileSize(file);
    const extensionError = validateFileExtension(file);
    const mimeError = validateMimeType(file);
    const nameError = validateFileName(file);

    // 收集错误
    if (sizeError) errors.push(sizeError);
    if (extensionError) errors.push(extensionError);
    if (mimeError) errors.push(mimeError);
    if (nameError) errors.push(nameError);

    // 特殊情况：如果MIME类型不匹配但扩展名正确，降级为警告
    if (mimeError && !extensionError) {
      const mimeWarning = { ...mimeError };
      mimeWarning.message = `文件类型检测可能不准确: ${file.type || '未知'}。将基于文件扩展名继续处理。`;
      warnings.push(mimeWarning);
      // 从错误中移除MIME错误
      const mimeErrorIndex = errors.findIndex(e => e.code === 'INVALID_MIME_TYPE');
      if (mimeErrorIndex > -1) {
        errors.splice(mimeErrorIndex, 1);
      }
    }

    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    };

    // 更新状态
    setValidationErrors(errors);
    setIsValid(result.isValid);

    return result;
  }, [validateFileSize, validateFileExtension, validateMimeType, validateFileName]);

  return {
    validateFile,
    validationErrors,
    isValid,
    clearErrors
  };
};

export default useFileValidation;