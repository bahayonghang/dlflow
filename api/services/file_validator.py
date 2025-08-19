import os
import pandas as pd
import pyarrow.parquet as pq
import pyarrow as pa
from typing import Dict, List, Any, Optional, Tuple, Union
from dataclasses import dataclass
from enum import Enum
import mimetypes
import magic
import chardet
from datetime import datetime
import re

class ValidationLevel(Enum):
    """验证级别"""
    BASIC = "basic"          # 基础验证：文件大小、格式
    STRUCTURE = "structure"  # 结构验证：列名、数据类型
    CONTENT = "content"      # 内容验证：数据质量、完整性
    ADVANCED = "advanced"    # 高级验证：业务规则、数据关系

class ValidationSeverity(Enum):
    """验证严重程度"""
    ERROR = "error"      # 错误：阻止上传
    WARNING = "warning"  # 警告：可以上传但需要注意
    INFO = "info"        # 信息：提示性信息

@dataclass
class ValidationResult:
    """验证结果"""
    is_valid: bool
    severity: ValidationSeverity
    code: str
    message: str
    field: Optional[str] = None
    expected: Optional[str] = None
    actual: Optional[str] = None
    suggestions: List[str] = None
    
    def __post_init__(self):
        if self.suggestions is None:
            self.suggestions = []

@dataclass
class FileValidationReport:
    """文件验证报告"""
    file_path: str
    file_size: int
    file_type: str
    encoding: Optional[str]
    is_valid: bool
    validation_results: List[ValidationResult]
    metadata: Dict[str, Any]
    
    @property
    def errors(self) -> List[ValidationResult]:
        return [r for r in self.validation_results if r.severity == ValidationSeverity.ERROR]
    
    @property
    def warnings(self) -> List[ValidationResult]:
        return [r for r in self.validation_results if r.severity == ValidationSeverity.WARNING]
    
    @property
    def infos(self) -> List[ValidationResult]:
        return [r for r in self.validation_results if r.severity == ValidationSeverity.INFO]

class FileValidator:
    """文件验证器"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or self._get_default_config()
        
    def _get_default_config(self) -> Dict[str, Any]:
        """获取默认配置"""
        return {
            'max_file_size': 100 * 1024 * 1024,  # 100MB
            'allowed_extensions': ['.csv', '.parquet'],
            'allowed_mime_types': ['text/csv', 'application/octet-stream'],
            'max_columns': 1000,
            'max_rows': 1000000,
            'required_encodings': ['utf-8', 'utf-8-sig'],
            'datetime_columns': ['DateTime', 'tagTime', 'timestamp', 'time'],
            'required_columns': [],
            'column_name_pattern': r'^[a-zA-Z][a-zA-Z0-9_]*$',
            'validate_data_types': True,
            'check_duplicates': True,
            'check_null_percentage': True,
            'max_null_percentage': 0.5  # 50%
        }
    
    def validate_file(self, file_path: str, validation_level: ValidationLevel = ValidationLevel.CONTENT) -> FileValidationReport:
        """验证文件"""
        results = []
        metadata = {}
        
        try:
            # 基础验证
            basic_results, basic_metadata = self._validate_basic(file_path)
            results.extend(basic_results)
            metadata.update(basic_metadata)
            
            # 如果基础验证失败，直接返回
            if any(r.severity == ValidationSeverity.ERROR for r in basic_results):
                return self._create_report(file_path, results, metadata, False)
            
            # 结构验证
            if validation_level.value in ['structure', 'content', 'advanced']:
                structure_results, structure_metadata = self._validate_structure(file_path, metadata['file_type'])
                results.extend(structure_results)
                metadata.update(structure_metadata)
                
                # 如果结构验证失败，直接返回
                if any(r.severity == ValidationSeverity.ERROR for r in structure_results):
                    return self._create_report(file_path, results, metadata, False)
            
            # 内容验证
            if validation_level.value in ['content', 'advanced']:
                content_results, content_metadata = self._validate_content(file_path, metadata['file_type'])
                results.extend(content_results)
                metadata.update(content_metadata)
            
            # 高级验证
            if validation_level == ValidationLevel.ADVANCED:
                advanced_results, advanced_metadata = self._validate_advanced(file_path, metadata['file_type'])
                results.extend(advanced_results)
                metadata.update(advanced_metadata)
            
            # 判断整体是否有效
            is_valid = not any(r.severity == ValidationSeverity.ERROR for r in results)
            
            return self._create_report(file_path, results, metadata, is_valid)
            
        except Exception as e:
            error_result = ValidationResult(
                is_valid=False,
                severity=ValidationSeverity.ERROR,
                code="VALIDATION_EXCEPTION",
                message=f"验证过程中发生异常: {str(e)}",
                suggestions=["请检查文件是否损坏", "尝试重新上传文件"]
            )
            return self._create_report(file_path, [error_result], metadata, False)
    
    def _validate_basic(self, file_path: str) -> Tuple[List[ValidationResult], Dict[str, Any]]:
        """基础验证"""
        results = []
        metadata = {}
        
        # 检查文件是否存在
        if not os.path.exists(file_path):
            results.append(ValidationResult(
                is_valid=False,
                severity=ValidationSeverity.ERROR,
                code="FILE_NOT_FOUND",
                message="文件不存在"
            ))
            return results, metadata
        
        # 获取文件信息
        file_size = os.path.getsize(file_path)
        file_ext = os.path.splitext(file_path)[1].lower()
        
        metadata.update({
            'file_size': file_size,
            'file_extension': file_ext
        })
        
        # 检查文件大小
        if file_size > self.config['max_file_size']:
            results.append(ValidationResult(
                is_valid=False,
                severity=ValidationSeverity.ERROR,
                code="FILE_TOO_LARGE",
                message=f"文件大小超过限制",
                expected=f"<= {self.config['max_file_size'] / 1024 / 1024:.1f}MB",
                actual=f"{file_size / 1024 / 1024:.1f}MB",
                suggestions=["压缩文件或分割成多个小文件"]
            ))
        
        # 检查文件扩展名
        if file_ext not in self.config['allowed_extensions']:
            results.append(ValidationResult(
                is_valid=False,
                severity=ValidationSeverity.ERROR,
                code="INVALID_FILE_EXTENSION",
                message="不支持的文件格式",
                expected=f"支持的格式: {', '.join(self.config['allowed_extensions'])}",
                actual=file_ext,
                suggestions=["转换文件格式后重试"]
            ))
            return results, metadata
        
        # 检查MIME类型
        try:
            mime_type = magic.from_file(file_path, mime=True)
            metadata['mime_type'] = mime_type
            
            if mime_type not in self.config['allowed_mime_types']:
                results.append(ValidationResult(
                    is_valid=False,
                    severity=ValidationSeverity.WARNING,
                    code="UNEXPECTED_MIME_TYPE",
                    message="文件MIME类型异常",
                    expected=f"期望: {', '.join(self.config['allowed_mime_types'])}",
                    actual=mime_type,
                    suggestions=["检查文件是否损坏"]
                ))
        except Exception:
            results.append(ValidationResult(
                is_valid=True,
                severity=ValidationSeverity.WARNING,
                code="MIME_TYPE_CHECK_FAILED",
                message="无法检测文件MIME类型"
            ))
        
        # 确定文件类型
        if file_ext == '.csv':
            metadata['file_type'] = 'csv'
        elif file_ext == '.parquet':
            metadata['file_type'] = 'parquet'
        else:
            metadata['file_type'] = 'unknown'
        
        return results, metadata
    
    def _validate_structure(self, file_path: str, file_type: str) -> Tuple[List[ValidationResult], Dict[str, Any]]:
        """结构验证"""
        results = []
        metadata = {}
        
        try:
            if file_type == 'csv':
                return self._validate_csv_structure(file_path)
            elif file_type == 'parquet':
                return self._validate_parquet_structure(file_path)
            else:
                results.append(ValidationResult(
                    is_valid=False,
                    severity=ValidationSeverity.ERROR,
                    code="UNSUPPORTED_FILE_TYPE",
                    message=f"不支持的文件类型: {file_type}"
                ))
                return results, metadata
                
        except Exception as e:
            results.append(ValidationResult(
                is_valid=False,
                severity=ValidationSeverity.ERROR,
                code="STRUCTURE_VALIDATION_FAILED",
                message=f"结构验证失败: {str(e)}",
                suggestions=["检查文件格式是否正确", "确认文件没有损坏"]
            ))
            return results, metadata
    
    def _validate_csv_structure(self, file_path: str) -> Tuple[List[ValidationResult], Dict[str, Any]]:
        """CSV结构验证"""
        results = []
        metadata = {}
        
        # 检测编码
        with open(file_path, 'rb') as f:
            raw_data = f.read(10000)  # 读取前10KB检测编码
            encoding_result = chardet.detect(raw_data)
            encoding = encoding_result['encoding']
            confidence = encoding_result['confidence']
        
        metadata['encoding'] = encoding
        metadata['encoding_confidence'] = confidence
        
        if encoding.lower() not in [enc.lower() for enc in self.config['required_encodings']]:
            results.append(ValidationResult(
                is_valid=False,
                severity=ValidationSeverity.WARNING,
                code="ENCODING_WARNING",
                message="文件编码可能导致中文乱码",
                expected="UTF-8",
                actual=encoding,
                suggestions=["将文件转换为UTF-8编码"]
            ))
        
        # 尝试读取CSV
        try:
            # 先读取少量数据检查结构
            df_sample = pd.read_csv(file_path, encoding=encoding, nrows=100)
            
            # 检查列数
            num_columns = len(df_sample.columns)
            metadata['num_columns'] = num_columns
            metadata['columns'] = df_sample.columns.tolist()
            
            if num_columns > self.config['max_columns']:
                results.append(ValidationResult(
                    is_valid=False,
                    severity=ValidationSeverity.ERROR,
                    code="TOO_MANY_COLUMNS",
                    message="列数超过限制",
                    expected=f"<= {self.config['max_columns']}",
                    actual=str(num_columns)
                ))
            
            # 检查列名
            invalid_columns = []
            for col in df_sample.columns:
                if not re.match(self.config['column_name_pattern'], str(col)):
                    invalid_columns.append(col)
            
            if invalid_columns:
                results.append(ValidationResult(
                    is_valid=False,
                    severity=ValidationSeverity.WARNING,
                    code="INVALID_COLUMN_NAMES",
                    message="列名格式不规范",
                    field=', '.join(map(str, invalid_columns)),
                    suggestions=["列名应以字母开头，只包含字母、数字和下划线"]
                ))
            
            # 检查是否有重复列名
            duplicate_columns = df_sample.columns[df_sample.columns.duplicated()].tolist()
            if duplicate_columns:
                results.append(ValidationResult(
                    is_valid=False,
                    severity=ValidationSeverity.ERROR,
                    code="DUPLICATE_COLUMNS",
                    message="存在重复的列名",
                    field=', '.join(duplicate_columns),
                    suggestions=["重命名重复的列"]
                ))
            
            # 检查数据类型
            metadata['dtypes'] = df_sample.dtypes.to_dict()
            
        except pd.errors.EmptyDataError:
            results.append(ValidationResult(
                is_valid=False,
                severity=ValidationSeverity.ERROR,
                code="EMPTY_FILE",
                message="文件为空"
            ))
        except pd.errors.ParserError as e:
            results.append(ValidationResult(
                is_valid=False,
                severity=ValidationSeverity.ERROR,
                code="CSV_PARSE_ERROR",
                message=f"CSV解析错误: {str(e)}",
                suggestions=["检查CSV格式是否正确", "确认分隔符和引号使用"]
            ))
        
        return results, metadata
    
    def _validate_parquet_structure(self, file_path: str) -> Tuple[List[ValidationResult], Dict[str, Any]]:
        """Parquet结构验证"""
        results = []
        metadata = {}
        
        try:
            # 读取Parquet文件信息
            parquet_file = pq.ParquetFile(file_path)
            schema = parquet_file.schema
            
            # 获取基本信息
            num_columns = len(schema)
            num_rows = parquet_file.metadata.num_rows
            
            metadata.update({
                'num_columns': num_columns,
                'num_rows': num_rows,
                'columns': [field.name for field in schema],
                'schema': {field.name: str(field.type) for field in schema}
            })
            
            # 检查列数
            if num_columns > self.config['max_columns']:
                results.append(ValidationResult(
                    is_valid=False,
                    severity=ValidationSeverity.ERROR,
                    code="TOO_MANY_COLUMNS",
                    message="列数超过限制",
                    expected=f"<= {self.config['max_columns']}",
                    actual=str(num_columns)
                ))
            
            # 检查行数
            if num_rows > self.config['max_rows']:
                results.append(ValidationResult(
                    is_valid=False,
                    severity=ValidationSeverity.WARNING,
                    code="LARGE_DATASET",
                    message="数据集较大，处理可能需要更长时间",
                    actual=f"{num_rows} 行"
                ))
            
        except Exception as e:
            results.append(ValidationResult(
                is_valid=False,
                severity=ValidationSeverity.ERROR,
                code="PARQUET_READ_ERROR",
                message=f"Parquet文件读取错误: {str(e)}",
                suggestions=["检查文件是否损坏", "确认文件格式正确"]
            ))
        
        return results, metadata
    
    def _validate_content(self, file_path: str, file_type: str) -> Tuple[List[ValidationResult], Dict[str, Any]]:
        """内容验证"""
        results = []
        metadata = {}
        
        try:
            # 读取数据进行内容验证
            if file_type == 'csv':
                df = pd.read_csv(file_path, nrows=10000)  # 限制读取行数以提高性能
            elif file_type == 'parquet':
                df = pd.read_parquet(file_path)
                if len(df) > 10000:
                    df = df.head(10000)  # 限制分析的行数
            else:
                return results, metadata
            
            # 检查空值比例
            null_percentages = df.isnull().sum() / len(df)
            high_null_columns = null_percentages[null_percentages > self.config['max_null_percentage']].index.tolist()
            
            if high_null_columns:
                results.append(ValidationResult(
                    is_valid=True,
                    severity=ValidationSeverity.WARNING,
                    code="HIGH_NULL_PERCENTAGE",
                    message="部分列空值比例较高",
                    field=', '.join(high_null_columns),
                    suggestions=["检查数据完整性", "考虑数据清洗"]
                ))
            
            metadata['null_percentages'] = null_percentages.to_dict()
            
            # 检查时间列
            datetime_columns = []
            for col in df.columns:
                if any(dt_col.lower() in col.lower() for dt_col in self.config['datetime_columns']):
                    datetime_columns.append(col)
                    # 尝试解析时间格式
                    try:
                        pd.to_datetime(df[col].dropna().head(100))
                        results.append(ValidationResult(
                            is_valid=True,
                            severity=ValidationSeverity.INFO,
                            code="DATETIME_COLUMN_DETECTED",
                            message=f"检测到时间列: {col}",
                            field=col
                        ))
                    except Exception:
                        results.append(ValidationResult(
                            is_valid=True,
                            severity=ValidationSeverity.WARNING,
                            code="DATETIME_PARSE_WARNING",
                            message=f"时间列格式可能不标准: {col}",
                            field=col,
                            suggestions=["检查时间格式是否标准"]
                        ))
            
            metadata['datetime_columns'] = datetime_columns
            
            # 检查重复行
            if self.config['check_duplicates']:
                duplicate_count = df.duplicated().sum()
                if duplicate_count > 0:
                    results.append(ValidationResult(
                        is_valid=True,
                        severity=ValidationSeverity.WARNING,
                        code="DUPLICATE_ROWS",
                        message=f"发现 {duplicate_count} 行重复数据",
                        suggestions=["考虑去除重复数据"]
                    ))
                
                metadata['duplicate_count'] = duplicate_count
            
            # 数据类型统计
            metadata['data_summary'] = {
                'total_rows': len(df),
                'total_columns': len(df.columns),
                'numeric_columns': len(df.select_dtypes(include=['number']).columns),
                'text_columns': len(df.select_dtypes(include=['object']).columns),
                'datetime_columns': len(datetime_columns)
            }
            
        except Exception as e:
            results.append(ValidationResult(
                is_valid=False,
                severity=ValidationSeverity.ERROR,
                code="CONTENT_VALIDATION_FAILED",
                message=f"内容验证失败: {str(e)}",
                suggestions=["检查数据格式", "确认文件完整性"]
            ))
        
        return results, metadata
    
    def _validate_advanced(self, file_path: str, file_type: str) -> Tuple[List[ValidationResult], Dict[str, Any]]:
        """高级验证"""
        results = []
        metadata = {}
        
        # 这里可以添加业务相关的验证逻辑
        # 例如：特定字段的业务规则验证、数据关系验证等
        
        return results, metadata
    
    def _create_report(self, file_path: str, results: List[ValidationResult], metadata: Dict[str, Any], is_valid: bool) -> FileValidationReport:
        """创建验证报告"""
        return FileValidationReport(
            file_path=file_path,
            file_size=metadata.get('file_size', 0),
            file_type=metadata.get('file_type', 'unknown'),
            encoding=metadata.get('encoding'),
            is_valid=is_valid,
            validation_results=results,
            metadata=metadata
        )

# 便捷函数
def validate_file(file_path: str, config: Optional[Dict[str, Any]] = None, validation_level: ValidationLevel = ValidationLevel.CONTENT) -> FileValidationReport:
    """验证文件的便捷函数"""
    validator = FileValidator(config)
    return validator.validate_file(file_path, validation_level)