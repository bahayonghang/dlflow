/**
 * 节点类型管理API路由
 */

import express, { type Request, type Response } from 'express';

const router = express.Router();

// 节点类型定义
interface NodeType {
  id: string;
  name: string;
  category: string;
  description: string;
  icon?: string;
  color?: string;
  inputs: NodePort[];
  outputs: NodePort[];
  properties: NodeProperty[];
  metadata?: any;
}

interface NodePort {
  id: string;
  name: string;
  type: 'data' | 'file' | 'text' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description?: string;
}

interface NodeProperty {
  id: string;
  name: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'textarea' | 'file';
  required: boolean;
  default_value?: any;
  options?: string[];
  description?: string;
  validation?: any;
}

// 预定义的节点类型
const defaultNodeTypes: NodeType[] = [
  {
    id: 'data-input',
    name: '数据输入',
    category: 'input',
    description: '从文件或数据库读取数据',
    icon: 'database',
    color: '#4CAF50',
    inputs: [],
    outputs: [
      {
        id: 'data',
        name: '数据输出',
        type: 'data',
        required: true,
        description: '输出的数据集'
      }
    ],
    properties: [
      {
        id: 'source_type',
        name: '数据源类型',
        type: 'select',
        required: true,
        options: ['file', 'database', 'api'],
        default_value: 'file',
        description: '选择数据源类型'
      },
      {
        id: 'file_path',
        name: '文件路径',
        type: 'file',
        required: false,
        description: '选择要读取的文件'
      }
    ]
  },
  {
    id: 'data-filter',
    name: '数据过滤',
    category: 'transform',
    description: '根据条件过滤数据',
    icon: 'filter',
    color: '#2196F3',
    inputs: [
      {
        id: 'data',
        name: '输入数据',
        type: 'data',
        required: true,
        description: '要过滤的数据集'
      }
    ],
    outputs: [
      {
        id: 'filtered_data',
        name: '过滤后数据',
        type: 'data',
        required: true,
        description: '过滤后的数据集'
      }
    ],
    properties: [
      {
        id: 'filter_column',
        name: '过滤列',
        type: 'text',
        required: true,
        description: '要过滤的列名'
      },
      {
        id: 'filter_operator',
        name: '过滤操作符',
        type: 'select',
        required: true,
        options: ['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'not_contains'],
        default_value: 'equals',
        description: '过滤条件操作符'
      },
      {
        id: 'filter_value',
        name: '过滤值',
        type: 'text',
        required: true,
        description: '过滤条件的值'
      }
    ]
  },
  {
    id: 'data-transform',
    name: '数据转换',
    category: 'transform',
    description: '对数据进行转换操作',
    icon: 'transform',
    color: '#FF9800',
    inputs: [
      {
        id: 'data',
        name: '输入数据',
        type: 'data',
        required: true,
        description: '要转换的数据集'
      }
    ],
    outputs: [
      {
        id: 'transformed_data',
        name: '转换后数据',
        type: 'data',
        required: true,
        description: '转换后的数据集'
      }
    ],
    properties: [
      {
        id: 'transform_type',
        name: '转换类型',
        type: 'select',
        required: true,
        options: ['rename_column', 'add_column', 'remove_column', 'calculate_column', 'sort', 'group_by'],
        default_value: 'rename_column',
        description: '选择转换操作类型'
      },
      {
        id: 'transform_config',
        name: '转换配置',
        type: 'textarea',
        required: true,
        description: '转换操作的详细配置（JSON格式）'
      }
    ]
  },
  {
    id: 'data-analysis',
    name: '数据分析',
    category: 'analysis',
    description: '对数据进行统计分析',
    icon: 'analytics',
    color: '#9C27B0',
    inputs: [
      {
        id: 'data',
        name: '输入数据',
        type: 'data',
        required: true,
        description: '要分析的数据集'
      }
    ],
    outputs: [
      {
        id: 'analysis_result',
        name: '分析结果',
        type: 'object',
        required: true,
        description: '分析结果数据'
      }
    ],
    properties: [
      {
        id: 'analysis_type',
        name: '分析类型',
        type: 'select',
        required: true,
        options: ['descriptive', 'correlation', 'regression', 'clustering', 'time_series'],
        default_value: 'descriptive',
        description: '选择分析类型'
      },
      {
        id: 'target_columns',
        name: '目标列',
        type: 'text',
        required: true,
        description: '要分析的列名（多个列用逗号分隔）'
      }
    ]
  },
  {
    id: 'data-visualization',
    name: '数据可视化',
    category: 'output',
    description: '生成数据图表',
    icon: 'chart',
    color: '#E91E63',
    inputs: [
      {
        id: 'data',
        name: '输入数据',
        type: 'data',
        required: true,
        description: '要可视化的数据集'
      }
    ],
    outputs: [
      {
        id: 'chart',
        name: '图表',
        type: 'file',
        required: true,
        description: '生成的图表文件'
      }
    ],
    properties: [
      {
        id: 'chart_type',
        name: '图表类型',
        type: 'select',
        required: true,
        options: ['line', 'bar', 'scatter', 'histogram', 'pie', 'heatmap', 'box'],
        default_value: 'line',
        description: '选择图表类型'
      },
      {
        id: 'x_column',
        name: 'X轴列',
        type: 'text',
        required: true,
        description: 'X轴对应的列名'
      },
      {
        id: 'y_column',
        name: 'Y轴列',
        type: 'text',
        required: true,
        description: 'Y轴对应的列名'
      },
      {
        id: 'title',
        name: '图表标题',
        type: 'text',
        required: false,
        description: '图表的标题'
      }
    ]
  },
  {
    id: 'data-export',
    name: '数据导出',
    category: 'output',
    description: '将数据导出到文件',
    icon: 'download',
    color: '#607D8B',
    inputs: [
      {
        id: 'data',
        name: '输入数据',
        type: 'data',
        required: true,
        description: '要导出的数据集'
      }
    ],
    outputs: [
      {
        id: 'file',
        name: '导出文件',
        type: 'file',
        required: true,
        description: '导出的文件'
      }
    ],
    properties: [
      {
        id: 'export_format',
        name: '导出格式',
        type: 'select',
        required: true,
        options: ['csv', 'excel', 'json', 'parquet'],
        default_value: 'csv',
        description: '选择导出文件格式'
      },
      {
        id: 'file_name',
        name: '文件名',
        type: 'text',
        required: true,
        description: '导出文件的名称'
      }
    ]
  }
];

/**
 * 获取所有节点类型
 * GET /api/node-types
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    
    let nodeTypes = defaultNodeTypes;
    
    // 如果指定了分类，则过滤节点类型
    if (category && typeof category === 'string') {
      nodeTypes = defaultNodeTypes.filter(nodeType => nodeType.category === category);
    }
    
    res.json({
      success: true,
      node_types: nodeTypes,
      total: nodeTypes.length,
      categories: ['input', 'transform', 'analysis', 'output']
    });
  } catch (error) {
    console.error('Error fetching node types:', error);
    res.status(500).json({
      success: false,
      error: '获取节点类型失败'
    });
  }
});

/**
 * 获取特定节点类型
 * GET /api/node-types/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const nodeType = defaultNodeTypes.find(nt => nt.id === id);
    
    if (!nodeType) {
      return res.status(404).json({
        success: false,
        error: '节点类型不存在'
      });
    }
    
    res.json({
      success: true,
      node_type: nodeType
    });
  } catch (error) {
    console.error('Error fetching node type:', error);
    res.status(500).json({
      success: false,
      error: '获取节点类型失败'
    });
  }
});

/**
 * 获取节点类型分类
 * GET /api/node-types/categories
 */
router.get('/meta/categories', async (req: Request, res: Response) => {
  try {
    const categories = [
      {
        id: 'input',
        name: '数据输入',
        description: '数据源和输入节点',
        icon: 'input',
        color: '#4CAF50'
      },
      {
        id: 'transform',
        name: '数据转换',
        description: '数据处理和转换节点',
        icon: 'transform',
        color: '#2196F3'
      },
      {
        id: 'analysis',
        name: '数据分析',
        description: '数据分析和机器学习节点',
        icon: 'analytics',
        color: '#9C27B0'
      },
      {
        id: 'output',
        name: '数据输出',
        description: '数据导出和可视化节点',
        icon: 'output',
        color: '#E91E63'
      }
    ];
    
    res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('Error fetching node type categories:', error);
    res.status(500).json({
      success: false,
      error: '获取节点类型分类失败'
    });
  }
});

export default router;