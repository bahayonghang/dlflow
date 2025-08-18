"""节点类型API端点"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter()


class NodeType(BaseModel):
    """节点类型模型"""
    id: str
    name: str
    category: str
    parameters: List[dict]
    description: str


class NodeTypesResponse(BaseModel):
    """节点类型列表响应模型"""
    node_types: List[NodeType]


@router.get("/", response_model=NodeTypesResponse)
async def get_node_types():
    """获取可用节点类型列表"""
    node_types = [
        {
            "id": "data_input",
            "name": "数据输入",
            "category": "input",
            "description": "从上传的文件中读取数据",
            "parameters": [
                {
                    "name": "file_id",
                    "type": "select",
                    "label": "选择文件",
                    "required": True,
                    "options": "dynamic_file_list"
                }
            ]
        },
        {
            "id": "time_parser",
            "name": "时间数据解析",
            "category": "transform",
            "description": "自动识别和解析时间列（DateTime或tagTime格式）",
            "parameters": [
                {
                    "name": "auto_detect",
                    "type": "boolean",
                    "label": "自动检测时间列",
                    "default": True
                },
                {
                    "name": "time_column",
                    "type": "select",
                    "label": "时间列",
                    "required": False,
                    "options": "dynamic_column_list"
                }
            ]
        },
        {
            "id": "data_filter",
            "name": "数据过滤",
            "category": "transform",
            "description": "根据条件过滤数据行",
            "parameters": [
                {
                    "name": "filters",
                    "type": "filter_list",
                    "label": "过滤条件",
                    "required": True
                }
            ]
        },
        {
            "id": "data_aggregate",
            "name": "数据聚合",
            "category": "transform",
            "description": "对数据进行分组聚合操作",
            "parameters": [
                {
                    "name": "group_by",
                    "type": "multi_select",
                    "label": "分组字段",
                    "options": "dynamic_column_list"
                },
                {
                    "name": "aggregations",
                    "type": "aggregation_list",
                    "label": "聚合操作",
                    "required": True
                }
            ]
        },
        {
            "id": "variable_analysis",
            "name": "多变量分析",
            "category": "analysis",
            "description": "分析所有变量的类型、分布和相关性",
            "parameters": [
                {
                    "name": "include_correlations",
                    "type": "boolean",
                    "label": "计算相关性",
                    "default": True
                },
                {
                    "name": "exclude_time_column",
                    "type": "boolean",
                    "label": "排除时间列",
                    "default": True
                }
            ]
        },
        {
            "id": "data_visualization",
            "name": "数据可视化",
            "category": "output",
            "description": "生成数据图表",
            "parameters": [
                {
                    "name": "chart_type",
                    "type": "select",
                    "label": "图表类型",
                    "required": True,
                    "options": [
                        {"value": "bar", "label": "柱状图"},
                        {"value": "line", "label": "折线图"},
                        {"value": "scatter", "label": "散点图"},
                        {"value": "heatmap", "label": "热力图"}
                    ]
                },
                {
                    "name": "x_field",
                    "type": "select",
                    "label": "X轴字段",
                    "required": True,
                    "options": "dynamic_column_list"
                },
                {
                    "name": "y_field",
                    "type": "select",
                    "label": "Y轴字段",
                    "required": False,
                    "options": "dynamic_column_list"
                }
            ]
        },
        {
            "id": "data_export",
            "name": "数据导出",
            "category": "output",
            "description": "导出处理后的数据",
            "parameters": [
                {
                    "name": "format",
                    "type": "select",
                    "label": "导出格式",
                    "required": True,
                    "options": [
                        {"value": "csv", "label": "CSV格式"},
                        {"value": "parquet", "label": "Parquet格式"}
                    ]
                },
                {
                    "name": "filename",
                    "type": "text",
                    "label": "文件名",
                    "default": "processed_data"
                }
            ]
        },
        {
            "id": "data_statistics",
            "name": "统计分析",
            "category": "analysis",
            "description": "生成数据的描述性统计信息",
            "parameters": [
                {
                    "name": "include_numeric_only",
                    "type": "boolean",
                    "label": "仅数值列",
                    "default": False
                },
                {
                    "name": "percentiles",
                    "type": "multi_select",
                    "label": "百分位数",
                    "options": [
                        {"value": "0.25", "label": "25%"},
                        {"value": "0.5", "label": "50%"},
                        {"value": "0.75", "label": "75%"},
                        {"value": "0.9", "label": "90%"},
                        {"value": "0.95", "label": "95%"}
                    ],
                    "default": ["0.25", "0.5", "0.75"]
                }
            ]
        }
    ]
    
    return NodeTypesResponse(node_types=[NodeType(**nt) for nt in node_types])