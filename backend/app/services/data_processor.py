"""数据处理服务模块"""

import polars as pl
from datetime import datetime
from typing import Dict, Any, Optional, List, Tuple

from app.core.config import settings


class DataProcessor:
    """数据处理器"""
    
    @staticmethod
    def detect_time_column(df: pl.DataFrame) -> Optional[Dict[str, Any]]:
        """检测时间列"""
        if df.height == 0:
            return None
        
        # 检查第一列是否为时间列
        first_column = df.columns[0]
        
        # 检查列名是否匹配时间列模式
        if first_column in settings.TIME_COLUMNS:
            column_type = "datetime" if first_column == "DateTime" else "tagtime"
            
            # 验证数据格式
            sample_values = df[first_column].head(10).to_list()
            valid_format = DataProcessor._validate_time_format(sample_values, column_type)
            
            if valid_format:
                return {
                    "column_name": first_column,
                    "column_type": column_type,
                    "format": settings.DATETIME_FORMAT if column_type == "datetime" else settings.TAGTIME_FORMAT,
                    "detected": True
                }
        
        return None
    
    @staticmethod
    def _validate_time_format(values: List[Any], column_type: str) -> bool:
        """验证时间格式"""
        try:
            for value in values:
                if value is None:
                    continue
                
                if column_type == "datetime":
                    # 验证标准日期时间格式
                    datetime.strptime(str(value), settings.DATETIME_FORMAT)
                elif column_type == "tagtime":
                    # 验证tagTime格式 (YYYYMMDDHH)
                    value_str = str(value)
                    if len(value_str) != 10 or not value_str.isdigit():
                        return False
                    
                    # 尝试解析为日期时间
                    year = int(value_str[:4])
                    month = int(value_str[4:6])
                    day = int(value_str[6:8])
                    hour = int(value_str[8:10])
                    
                    # 验证日期时间的有效性
                    datetime(year, month, day, hour)
            
            return True
        except (ValueError, TypeError):
            return False
    
    @staticmethod
    def parse_time_column(df: pl.DataFrame, time_info: Dict[str, Any]) -> pl.DataFrame:
        """解析时间列"""
        column_name = time_info["column_name"]
        column_type = time_info["column_type"]
        
        if column_type == "datetime":
            # 标准日期时间格式，直接转换
            df = df.with_columns(
                pl.col(column_name).str.strptime(pl.Datetime, settings.DATETIME_FORMAT)
            )
        elif column_type == "tagtime":
            # tagTime格式，需要特殊处理
            df = df.with_columns(
                pl.col(column_name).map_elements(
                    lambda x: DataProcessor._parse_tagtime(x),
                    return_dtype=pl.Datetime
                )
            )
        
        return df
    
    @staticmethod
    def _parse_tagtime(value: Any) -> Optional[datetime]:
        """解析tagTime格式"""
        try:
            if value is None:
                return None
            
            value_str = str(value)
            if len(value_str) != 10 or not value_str.isdigit():
                return None
            
            year = int(value_str[:4])
            month = int(value_str[4:6])
            day = int(value_str[6:8])
            hour = int(value_str[8:10])
            
            return datetime(year, month, day, hour)
        except (ValueError, TypeError):
            return None
    
    @staticmethod
    def analyze_variables(df: pl.DataFrame, exclude_time_column: bool = True) -> Dict[str, Any]:
        """分析变量"""
        columns = df.columns
        
        # 排除时间列
        if exclude_time_column and len(columns) > 0:
            # 检测时间列
            time_info = DataProcessor.detect_time_column(df)
            if time_info:
                columns = [col for col in columns if col != time_info["column_name"]]
        
        # 分析变量类型
        numeric_vars = []
        categorical_vars = []
        text_vars = []
        
        for col in columns:
            dtype = df[col].dtype
            
            if dtype in [pl.Int64, pl.Float64, pl.Int32, pl.Float32, pl.Int16, pl.Int8]:
                numeric_vars.append({
                    "name": col,
                    "type": "numeric",
                    "dtype": str(dtype),
                    "null_count": df[col].null_count(),
                    "unique_count": df[col].n_unique()
                })
            elif dtype == pl.Utf8:
                unique_count = df[col].n_unique()
                total_count = df.height
                
                # 如果唯一值比例小于0.5，认为是分类变量
                if unique_count / total_count < 0.5:
                    categorical_vars.append({
                        "name": col,
                        "type": "categorical",
                        "dtype": str(dtype),
                        "null_count": df[col].null_count(),
                        "unique_count": unique_count
                    })
                else:
                    text_vars.append({
                        "name": col,
                        "type": "text",
                        "dtype": str(dtype),
                        "null_count": df[col].null_count(),
                        "unique_count": unique_count
                    })
            else:
                # 其他类型暂时归类为文本
                text_vars.append({
                    "name": col,
                    "type": "other",
                    "dtype": str(dtype),
                    "null_count": df[col].null_count(),
                    "unique_count": df[col].n_unique()
                })
        
        return {
            "total_variables": len(columns),
            "numeric_variables": numeric_vars,
            "categorical_variables": categorical_vars,
            "text_variables": text_vars,
            "variable_summary": {
                "numeric_count": len(numeric_vars),
                "categorical_count": len(categorical_vars),
                "text_count": len(text_vars)
            }
        }
    
    @staticmethod
    def calculate_correlations(df: pl.DataFrame, numeric_columns: List[str]) -> Dict[str, Any]:
        """计算数值变量间的相关性"""
        if len(numeric_columns) < 2:
            return {"correlations": [], "message": "需要至少2个数值变量才能计算相关性"}
        
        try:
            # 选择数值列并计算相关性矩阵
            numeric_df = df.select(numeric_columns)
            
            # 使用Polars计算相关性
            correlations = []
            for i, col1 in enumerate(numeric_columns):
                for j, col2 in enumerate(numeric_columns):
                    if i < j:  # 只计算上三角矩阵
                        corr = numeric_df.select(
                            pl.corr(col1, col2).alias("correlation")
                        ).item()
                        
                        correlations.append({
                            "variable1": col1,
                            "variable2": col2,
                            "correlation": round(corr, 4) if corr is not None else None
                        })
            
            return {
                "correlations": correlations,
                "total_pairs": len(correlations)
            }
        
        except Exception as e:
            return {
                "correlations": [],
                "error": f"计算相关性失败: {str(e)}"
            }
    
    @staticmethod
    def generate_summary_statistics(df: pl.DataFrame, numeric_columns: List[str]) -> Dict[str, Any]:
        """生成汇总统计信息"""
        try:
            statistics = {}
            
            for col in numeric_columns:
                col_stats = df.select([
                    pl.col(col).count().alias("count"),
                    pl.col(col).mean().alias("mean"),
                    pl.col(col).std().alias("std"),
                    pl.col(col).min().alias("min"),
                    pl.col(col).quantile(0.25).alias("q25"),
                    pl.col(col).median().alias("median"),
                    pl.col(col).quantile(0.75).alias("q75"),
                    pl.col(col).max().alias("max"),
                    pl.col(col).null_count().alias("null_count")
                ]).to_dicts()[0]
                
                # 格式化数值
                for key, value in col_stats.items():
                    if value is not None and isinstance(value, (int, float)):
                        col_stats[key] = round(value, 4)
                
                statistics[col] = col_stats
            
            return statistics
        
        except Exception as e:
            return {"error": f"生成统计信息失败: {str(e)}"}
    
    @staticmethod
    def filter_data(df: pl.DataFrame, filters: List[Dict[str, Any]]) -> pl.DataFrame:
        """根据条件过滤数据"""
        for filter_condition in filters:
            column = filter_condition.get("column")
            operator = filter_condition.get("operator")
            value = filter_condition.get("value")
            
            if not all([column, operator, value is not None]):
                continue
            
            if operator == "==":
                df = df.filter(pl.col(column) == value)
            elif operator == "!=":
                df = df.filter(pl.col(column) != value)
            elif operator == ">":
                df = df.filter(pl.col(column) > value)
            elif operator == ">=":
                df = df.filter(pl.col(column) >= value)
            elif operator == "<":
                df = df.filter(pl.col(column) < value)
            elif operator == "<=":
                df = df.filter(pl.col(column) <= value)
            elif operator == "contains":
                df = df.filter(pl.col(column).str.contains(str(value)))
            elif operator == "in":
                if isinstance(value, list):
                    df = df.filter(pl.col(column).is_in(value))
        
        return df
    
    @staticmethod
    def aggregate_data(df: pl.DataFrame, group_by: List[str], aggregations: Dict[str, str]) -> pl.DataFrame:
        """聚合数据"""
        if not group_by:
            # 全局聚合
            agg_exprs = []
            for column, agg_func in aggregations.items():
                if agg_func == "sum":
                    agg_exprs.append(pl.col(column).sum().alias(f"{column}_sum"))
                elif agg_func == "mean":
                    agg_exprs.append(pl.col(column).mean().alias(f"{column}_mean"))
                elif agg_func == "count":
                    agg_exprs.append(pl.col(column).count().alias(f"{column}_count"))
                elif agg_func == "min":
                    agg_exprs.append(pl.col(column).min().alias(f"{column}_min"))
                elif agg_func == "max":
                    agg_exprs.append(pl.col(column).max().alias(f"{column}_max"))
            
            return df.select(agg_exprs)
        else:
            # 分组聚合
            agg_exprs = []
            for column, agg_func in aggregations.items():
                if agg_func == "sum":
                    agg_exprs.append(pl.col(column).sum())
                elif agg_func == "mean":
                    agg_exprs.append(pl.col(column).mean())
                elif agg_func == "count":
                    agg_exprs.append(pl.col(column).count())
                elif agg_func == "min":
                    agg_exprs.append(pl.col(column).min())
                elif agg_func == "max":
                    agg_exprs.append(pl.col(column).max())
            
            return df.group_by(group_by).agg(agg_exprs)