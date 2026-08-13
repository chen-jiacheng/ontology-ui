<template>
  <div class="ontology-editor">
    <!-- Toolbar -->
    <div class="toolbar">
      <span class="toolbar-title">本体建模</span>
      <el-divider direction="vertical" />
      <el-button @click="showAddEntityDialog = true">
        <el-icon><Plus /></el-icon> 新建实体
      </el-button>
      <el-button @click="showAddAttrDialog = true">
        <el-icon><Plus /></el-icon> 新建属性
      </el-button>
      <el-button :type="connectMode ? 'danger' : 'default'" @click="toggleConnectMode">
        <el-icon><Link /></el-icon> {{ connectMode ? '取消连线' : '创建关系' }}
      </el-button>
      <el-divider direction="vertical" />
      <el-button @click="showSparqlDialog = true">SPARQL 查询</el-button>
      <el-button @click="handleExport">导出 OWL</el-button>
      <el-dropdown @command="handleGraphExport">
        <el-button>导出图谱</el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="png">导出 PNG</el-dropdown-item>
            <el-dropdown-item command="svg">导出 SVG</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <el-button @click="refreshAll">刷新</el-button>
    </div>

    <div class="editor-content">
      <!-- Left: Palette -->
      <div class="left-panel">
        <h3>组件面板</h3>
        <p class="panel-hint">拖拽到画布创建，或点击已有项编辑</p>

        <div class="palette-section">
          <div class="section-title">
            <span class="section-icon entity-icon">E</span>
            实体 ({{ entities.length }})
          </div>
          <div
            v-for="entity in entities"
            :key="entity.uri"
            class="palette-item palette-entity"
            :class="{ active: selectedNode?.uri === entity.uri }"
            draggable="true"
            @dragstart="onPaletteDragStart($event, 'entity', entity)"
            @click="selectEntity(entity)"
          >
            <span class="item-icon">E</span>
            <span class="item-label">{{ entity.label || entity.uri?.split('#')?.pop() }}</span>
          </div>
          <div v-if="entities.length === 0" class="empty-hint">暂无实体，点击上方按钮创建</div>
        </div>

        <div class="palette-section">
          <div class="section-title">
            <span class="section-icon attr-icon">A</span>
            属性 ({{ dataProperties.length }})
          </div>
          <div
            v-for="prop in dataProperties"
            :key="prop.uri"
            class="palette-item palette-attr"
            :class="{ active: selectedNode?.uri === prop.uri }"
            @click="selectProperty(prop)"
          >
            <span class="item-icon">A</span>
            <span class="item-label">{{ prop.label || prop.uri?.split('#')?.pop() }}</span>
          </div>
          <div v-if="dataProperties.length === 0" class="empty-hint">暂无属性</div>
        </div>

        <div class="palette-section">
          <div class="section-title">
            <span class="section-icon rel-icon">R</span>
            关系 ({{ objectProperties.length }})
          </div>
          <div
            v-for="prop in objectProperties"
            :key="prop.uri"
            class="palette-item palette-rel"
            :class="{ active: selectedNode?.uri === prop.uri }"
            @click="selectProperty(prop)"
          >
            <span class="item-icon">R</span>
            <span class="item-label">{{ prop.label || prop.uri?.split('#')?.pop() }}</span>
          </div>
          <div v-if="objectProperties.length === 0" class="empty-hint">暂无关系</div>
        </div>
      </div>

      <!-- Center: Graph Canvas -->
      <div
        class="center-panel"
        @drop="onCanvasDrop"
        @dragover.prevent
      >
        <div ref="graphContainer" class="graph-container" />
        <div class="graph-legend">
          <div class="legend-item">
            <span class="legend-dot legend-dot-entity"></span>
            <span>实体</span>
          </div>
          <div class="legend-item">
            <span class="legend-line legend-line-rel"></span>
            <span>关系</span>
          </div>
          <div class="legend-item">
            <span class="legend-line legend-line-sub"></span>
            <span>继承</span>
          </div>
        </div>
        <div v-if="connectMode" class="connect-mode-hint">
          连线模式：请依次点击两个实体创建关系
        </div>
      </div>

      <!-- Right: Detail Panel -->
      <div class="right-panel">
        <h3>详情</h3>

        <!-- Entity Detail -->
        <div v-if="selectedNode && selectedNode.type === 'CLASS'" class="detail-section">
          <div class="detail-card entity-card">
            <div class="detail-badge badge-entity">实体</div>
            <div class="detail-name">{{ selectedNode.label || selectedNode.uri?.split('#')?.pop() }}</div>
            <div class="detail-uri" :title="selectedNode.uri">{{ selectedNode.uri }}</div>
          </div>
          <div v-if="entityAttrs.length > 0" class="detail-attrs">
            <div class="detail-subtitle">属性 ({{ entityAttrs.length }})</div>
            <div v-for="attr in entityAttrs" :key="attr.uri" class="attr-row">
              <el-tag size="small" type="success">属性</el-tag>
              <span>{{ attr.label || attr.uri?.split('#')?.pop() }}</span>
            </div>
          </div>
          <div v-if="entityRelations.length > 0" class="detail-relations">
            <div class="detail-subtitle">关系 ({{ entityRelations.length }})</div>
            <div v-for="rel in entityRelations" :key="rel.uri" class="rel-row">
              <el-tag size="small" type="warning">关系</el-tag>
              <span>{{ rel.label || rel.uri?.split('#')?.pop() }}</span>
              <span class="rel-target">→ {{ rel.targetLabel }}</span>
            </div>
          </div>
          <el-button type="danger" link style="margin-top: 12px" @click="handleDeleteSelected">删除实体</el-button>
        </div>

        <!-- Property/Relation Detail -->
        <div v-else-if="selectedNode && (selectedNode.type === 'DATA_PROPERTY' || selectedNode.type === 'OBJECT_PROPERTY')" class="detail-section">
          <div class="detail-card attr-card">
            <div class="detail-badge" :class="selectedNode.type === 'DATA_PROPERTY' ? 'badge-attr' : 'badge-rel'">
              {{ selectedNode.type === 'DATA_PROPERTY' ? '属性' : '关系' }}
            </div>
            <div class="detail-name">{{ selectedNode.label || selectedNode.uri?.split('#')?.pop() }}</div>
            <div class="detail-uri" :title="selectedNode.uri">{{ selectedNode.uri }}</div>
          </div>
          <div v-if="selectedNode.domainLabel" class="detail-meta">
            <span class="meta-label">定义域：</span>
            <span>{{ selectedNode.domainLabel }}</span>
          </div>
          <div v-if="selectedNode.rangeLabel" class="detail-meta">
            <span class="meta-label">值域：</span>
            <span>{{ selectedNode.rangeLabel }}</span>
          </div>
          <el-button type="danger" link style="margin-top: 12px" @click="handleDeleteSelected">删除</el-button>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-tip">
          <div style="font-size: 28px; margin-bottom: 8px;">🎯</div>
          <div>点击左侧项或画布节点查看详情</div>
          <div style="margin-top: 8px; font-size: 12px; color: #d9d9d9;">拖拽实体到画布可快速创建</div>
        </div>
      </div>
    </div>

    <!-- New Entity Dialog -->
    <el-dialog v-model="showAddEntityDialog" title="新建实体" width="500px">
      <el-form :model="entityForm" label-width="80px">
        <el-form-item label="URI" required>
          <el-input v-model="entityForm.uri" placeholder="http://example.org/MyEntity" />
        </el-form-item>
        <el-form-item label="名称" required>
          <el-input v-model="entityForm.label" placeholder="实体名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="entityForm.comment" type="textarea" />
        </el-form-item>
        <el-form-item label="父实体">
          <el-select v-model="entityForm.parentUri" clearable placeholder="无">
            <el-option v-for="e in entities" :key="e.uri" :label="e.label || e.uri" :value="e.uri" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddEntityDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAddEntity">创建</el-button>
      </template>
    </el-dialog>

    <!-- New Attribute Dialog -->
    <el-dialog v-model="showAddAttrDialog" title="新建属性" width="500px">
      <el-form :model="attrForm" label-width="80px">
        <el-form-item label="URI" required>
          <el-input v-model="attrForm.uri" />
        </el-form-item>
        <el-form-item label="名称" required>
          <el-input v-model="attrForm.label" />
        </el-form-item>
        <el-form-item label="类型" required>
          <el-select v-model="attrForm.type">
            <el-option label="属性 (数据属性)" value="DATA_PROPERTY" />
            <el-option label="关系 (对象属性)" value="OBJECT_PROPERTY" />
          </el-select>
        </el-form-item>
        <el-form-item label="所属实体">
          <el-select v-model="attrForm.domainUri" clearable>
            <el-option v-for="e in entities" :key="e.uri" :label="e.label || e.uri" :value="e.uri" />
          </el-select>
        </el-form-item>
        <el-form-item label="值域" v-if="attrForm.type === 'DATA_PROPERTY'">
          <el-select v-model="attrForm.rangeUri" clearable placeholder="数据类型">
            <el-option label="String" value="http://www.w3.org/2001/XMLSchema#string" />
            <el-option label="Integer" value="http://www.w3.org/2001/XMLSchema#integer" />
            <el-option label="Decimal" value="http://www.w3.org/2001/XMLSchema#decimal" />
            <el-option label="Boolean" value="http://www.w3.org/2001/XMLSchema#boolean" />
            <el-option label="Date" value="http://www.w3.org/2001/XMLSchema#date" />
          </el-select>
        </el-form-item>
        <el-form-item label="目标实体" v-if="attrForm.type === 'OBJECT_PROPERTY'">
          <el-select v-model="attrForm.rangeUri" clearable>
            <el-option v-for="e in entities" :key="e.uri" :label="e.label || e.uri" :value="e.uri" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddAttrDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAddAttr">创建</el-button>
      </template>
    </el-dialog>

    <!-- SPARQL Dialog -->
    <el-dialog v-model="showSparqlDialog" title="SPARQL 查询" width="700px">
      <div class="sparql-editor-wrapper">
        <div class="sparql-editor">
          <div class="sparql-line-numbers">
            <span v-for="n in sparqlLineCount" :key="n">{{ n }}</span>
          </div>
          <div class="sparql-input-area">
            <div class="sparql-highlight" v-html="highlightedSparql"></div>
            <textarea
              v-model="sparqlQuery"
              class="sparql-textarea"
              rows="8"
              placeholder="SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 10"
              spellcheck="false"
            />
          </div>
        </div>
      </div>
      <el-button type="primary" style="margin-top: 10px" @click="handleSparql">执行查询</el-button>
      <div v-if="sparqlResult" style="margin-top: 10px">
        <el-table :data="sparqlResult.results" size="small" max-height="300">
          <el-table-column v-for="v in sparqlResult.variables" :key="v" :prop="v" :label="v" />
        </el-table>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus, Link } from '@element-plus/icons-vue'
import { Graph } from '@antv/g6'
import { ontologyApi, classApi, propertyApi, relationApi, graphApi, sparqlApi } from '../../api'

const route = useRoute()
const ontologyId = route.params.id as string

// Data
const entities = ref<any[]>([])
const allProperties = ref<any[]>([])
const graphData = ref<any>({ nodes: [], edges: [] })
const selectedNode = ref<any>(null)
const graphContainer = ref<HTMLElement | null>(null)
let graph: Graph | null = null

// Dialogs
const showAddEntityDialog = ref(false)
const showAddAttrDialog = ref(false)
const showSparqlDialog = ref(false)

// Forms
const entityForm = ref({ uri: '', label: '', comment: '', parentUri: '' })
const attrForm = ref({ uri: '', label: '', type: 'DATA_PROPERTY', domainUri: '', rangeUri: '' })
const sparqlQuery = ref('')
const sparqlResult = ref<any>(null)

// Connect mode
const connectMode = ref(false)
const connectSource = ref<any>(null)

// Computed
const dataProperties = computed(() => allProperties.value.filter((p: any) => p.type === 'DATA_PROPERTY'))
const objectProperties = computed(() => allProperties.value.filter((p: any) => p.type === 'OBJECT_PROPERTY'))

const entityAttrs = computed(() => {
  if (!selectedNode.value || selectedNode.value.type !== 'CLASS') return []
  const uri = selectedNode.value.uri
  return dataProperties.value.filter((p: any) => p.domainUri === uri)
})

const entityRelations = computed(() => {
  if (!selectedNode.value || selectedNode.value.type !== 'CLASS') return []
  const uri = selectedNode.value.uri
  return objectProperties.value
    .filter((p: any) => p.domainUri === uri)
    .map((p: any) => ({
      ...p,
      targetLabel: entities.value.find((e: any) => e.uri === p.rangeUri)?.label || p.rangeUri?.split('#')?.pop() || '',
    }))
})

const sparqlKeywords = /\b(SELECT|WHERE|INSERT|DELETE|CONSTRUCT|DESCRIBE|ASK|PREFIX|BASE|FROM|ORDER|BY|LIMIT|OFFSET|FILTER|OPTIONAL|UNION|GRAPH|BIND|VALUES|AS|DISTINCT|REDUCED|GROUP|HAVING)\b/gi
const sparqlVariables = /[?$][\w]+/g
const sparqlURIs = /<[^>]+>/g
const sparqlStrings = /"[^"]*"|'[^']*'/g
const sparqlComments = /#[^\n]*/g

const sparqlLineCount = computed(() => (sparqlQuery.value.match(/\n/g) || []).length + 1)

const highlightedSparql = computed(() => {
  let text = sparqlQuery.value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  text = text.replace(sparqlComments, '<span class="sp-comment">$&</span>')
  text = text.replace(sparqlURIs, '<span class="sp-uri">$&</span>')
  text = text.replace(sparqlStrings, '<span class="sp-string">$&</span>')
  text = text.replace(sparqlKeywords, '<span class="sp-keyword">$&</span>')
  text = text.replace(sparqlVariables, '<span class="sp-var">$&</span>')
  return text + '\n'
})

// Fetch
const fetchEntities = async () => {
  try {
    const res = await classApi.list(ontologyId)
    entities.value = res.data
  } catch (e) { console.error(e) }
}

const fetchProperties = async () => {
  try {
    const res = await propertyApi.list(ontologyId)
    allProperties.value = res.data
  } catch (e) { console.error(e) }
}

const fetchGraph = async () => {
  try {
    const res = await graphApi.get(ontologyId)
    graphData.value = res.data
    renderGraph()
  } catch (e) { console.error(e) }
}

const refreshAll = async () => {
  await Promise.all([fetchEntities(), fetchProperties(), fetchGraph()])
}

// Graph rendering
// Color palette for entities
const ENTITY_COLORS = [
  { border: '#5B8FF9', dot: '#5B8FF9', bg: '#f0f5ff' },
  { border: '#5AD8A6', dot: '#5AD8A6', bg: '#f0fbf5' },
  { border: '#F6BD16', dot: '#F6BD16', bg: '#fffdf0' },
  { border: '#E86452', dot: '#E86452', bg: '#fff5f5' },
  { border: '#6DC8EC', dot: '#6DC8EC', bg: '#f0faff' },
  { border: '#945FB9', dot: '#945FB9', bg: '#f8f0ff' },
  { border: '#FF9845', dot: '#FF9845', bg: '#fff8f0' },
  { border: '#1E9493', dot: '#1E9493', bg: '#f0fafa' },
]

const getNodeColor = (index: number) => ENTITY_COLORS[index % ENTITY_COLORS.length]

// Build UML card HTML for entity node
const buildEntityCardHTML = (entity: any, color: any, attrs: any[], rels: any[]): string => {
  const name = entity.label || entity.uri?.split('#')?.pop() || entity.uri
  const comment = entity.comment || ''
  const attrRows = attrs.map(a => {
    const attrName = a.label || a.uri?.split('#')?.pop() || ''
    const attrType = a.rangeUri ? (a.rangeUri.split('#').pop() || a.rangeUri.split('/').pop() || 'String').toUpperCase() : 'STRING'
    return `<div class="attr-row"><span class="attr-name">${attrName}</span><span class="attr-type">${attrType}</span></div>`
  }).join('')
  const relRows = rels.map(r => {
    const relName = r.label || r.uri?.split('#')?.pop() || ''
    const targetName = entities.value.find((e: any) => e.uri === r.rangeUri)?.label || r.rangeUri?.split('#')?.pop() || ''
    return `<div class="attr-row"><span class="attr-name">${relName}</span><span class="attr-type">→ ${targetName}</span></div>`
  }).join('')

  return `
    <div class="uml-card" style="border:2px solid ${color.border};border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);min-width:180px;max-width:220px;background:#fff;">
      <div style="padding:10px 12px 8px;display:flex;align-items:flex-start;gap:8px;">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color.dot};margin-top:4px;flex-shrink:0;"></span>
        <div style="min-width:0;">
          <div style="font-size:14px;font-weight:700;color:#1f1f1f;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${name}</div>
          ${comment ? `<div style="font-size:11px;color:#8c8c8c;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${comment}</div>` : ''}
        </div>
      </div>
      ${attrs.length > 0 ? `<div style="border-top:1px solid #f0f0f0;padding:6px 12px 8px;">${attrRows}</div>` : ''}
      ${rels.length > 0 ? `<div style="border-top:1px solid #f0f0f0;padding:6px 12px 8px;">${relRows}</div>` : ''}
    </div>
  `
}

const renderGraph = () => {
  if (!graphContainer.value) return
  // Ensure container has dimensions before rendering
  if (graphContainer.value.clientWidth === 0 || graphContainer.value.clientHeight === 0) {
    setTimeout(renderGraph, 100)
    return
  }
  if (graph) graph.destroy()

  const allNodes: any[] = []
  const allEdges: any[] = []

  // Only entity nodes - properties and relations are embedded in cards
  entities.value.forEach((entity: any, idx: number) => {
    const color = getNodeColor(idx)
    const label = entity.label || entity.uri?.split('#')?.pop() || entity.uri
    const attrs = dataProperties.value.filter((p: any) => p.domainUri === entity.uri)
    const rels = objectProperties.value.filter((p: any) => p.domainUri === entity.uri)
    const cardHeight = Math.max(52, 44 + (attrs.length + rels.length) * 24)
    const cardWidth = 200

    allNodes.push({
      id: `entity_${entity.uri}`,
      data: { label, type: 'CLASS', uri: entity.uri },
      type: 'html',
      style: {
        innerHTML: buildEntityCardHTML(entity, color, attrs, rels),
        size: [cardWidth, cardHeight],
        dx: -cardWidth / 2,
        dy: -cardHeight / 2,
      },
    })
  })

  // Edges: subClassOf (inheritance) - very subtle dashed
  entities.value.forEach((entity: any) => {
    if (entity.parentUri) {
      allEdges.push({
        id: `sub_${entity.uri}`,
        source: `entity_${entity.uri}`,
        target: `entity_${entity.parentUri}`,
        style: {
          stroke: '#e8e8e8',
          lineWidth: 1,
          lineDash: [3, 3],
          endArrow: false,
        },
      })
    }
  })

  // Edges: object property (relationship) between entities
  objectProperties.value.forEach((prop: any) => {
    if (prop.domainUri && prop.rangeUri) {
      allEdges.push({
        id: `rel_${prop.uri}`,
        source: `entity_${prop.domainUri}`,
        target: `entity_${prop.rangeUri}`,
        style: {
          labelText: prop.label || prop.uri?.split('#')?.pop() || '',
          labelFontSize: 11,
          labelFill: '#595959',
          labelFontWeight: 500,
          labelBackground: true,
          labelBackgroundFill: '#fff',
          labelBackgroundRadius: 4,
          labelPadding: [3, 8],
          stroke: '#a0a0a0',
          lineWidth: 1.5,
          endArrow: true,
          endArrowSize: 5,
        },
      })
    }
  })

  graph = new Graph({
    container: graphContainer.value,
    autoFit: 'view',
    data: { nodes: allNodes, edges: allEdges },
    layout: {
      type: 'force',
      preventOverlap: true,
      nodeStrength: -400,
      edgeStrength: 0.08,
      linkDistance: 160,
      collideStrength: 0.9,
      collideRadius: 40,
    },
    animation: false,
    node: { type: 'html' },
    edge: { type: 'line' },
    behaviors: ['drag-canvas', 'zoom-canvas', 'drag-element'],
  })

  graph.on('node:click', (evt: any) => {
    const nodeId = evt.target.id
    const node = allNodes.find((n: any) => n.id === nodeId)
    if (node) {
      if (connectMode.value) {
        handleConnectClick(node)
      } else {
        const rawNode = graphData.value.nodes.find((n: any) => n.uri === node.data.uri)
        selectedNode.value = rawNode || node.data
      }
    }
  })

  graph.render()
}

// Drag and drop
const onPaletteDragStart = (event: DragEvent, type: string, item: any) => {
  event.dataTransfer!.effectAllowed = 'copy'
  event.dataTransfer!.setData('application/json', JSON.stringify({ type, item }))
}

const onCanvasDrop = async (event: DragEvent) => {
  event.preventDefault()
  const dataStr = event.dataTransfer?.getData('application/json')
  if (!dataStr) return

  const data = JSON.parse(dataStr)
  if (data.type !== 'entity') return

  const entity = data.item

  // Check if already exists
  const exists = entities.value.find((e: any) => e.uri === entity.uri)
  if (exists) {
    ElMessage.warning('该实体已存在')
    return
  }

  try {
    await classApi.create(ontologyId, {
      uri: entity.uri,
      label: entity.label,
      comment: entity.comment || '',
      parentUri: entity.parentUri || '',
    })
    ElMessage.success(`实体「${entity.label}」已添加到画布`)
    await refreshAll()
  } catch (e) {
    ElMessage.error('添加实体失败')
  }
}

// Connect mode
const toggleConnectMode = () => {
  connectMode.value = !connectMode.value
  connectSource.value = null
  if (!connectMode.value) {
    ElMessage.info('已退出连线模式')
  } else {
    ElMessage.info('连线模式：请点击源实体，再点击目标实体')
  }
}

const handleConnectClick = (node: any) => {
  if (!connectSource.value) {
    connectSource.value = node
    ElMessage.info(`已选择源实体：${node.label || node.uri?.split('#')?.pop()}，请点击目标实体`)
  } else {
    const source = connectSource.value
    const target = node
    if (source.id === target.id) {
      ElMessage.warning('不能连接到自身')
      connectSource.value = null
      return
    }
    // Find an object property to use, or prompt
    const objProps = objectProperties.value
    if (objProps.length === 0) {
      ElMessage.warning('请先创建一个关系（对象属性）')
      connectSource.value = null
      connectMode.value = false
      return
    }
    // Use the first object property, or show a quick select
    const prop = objProps[0]
    createRelation(source, target, prop)
  }
}

const createRelation = async (source: any, target: any, prop: any) => {
  try {
    await relationApi.create(ontologyId, {
      sourceClassUri: source.uri,
      targetClassUri: target.uri,
      propertyUri: prop.uri,
    })
    ElMessage.success(`关系已创建：${source.label} → ${prop.label} → ${target.label}`)
    connectSource.value = null
    connectMode.value = false
    await refreshAll()
  } catch (e) {
    ElMessage.error('创建关系失败')
  }
}

// Selection
const selectEntity = (entity: any) => {
  const graphNode = graphData.value.nodes.find((n: any) => n.uri === entity.uri)
  selectedNode.value = graphNode || { ...entity, type: 'CLASS' }
}

const selectProperty = (prop: any) => {
  selectedNode.value = {
    ...prop,
    type: prop.type,
    domainLabel: entities.value.find((e: any) => e.uri === prop.domainUri)?.label || '',
    rangeLabel: prop.type === 'OBJECT_PROPERTY'
      ? entities.value.find((e: any) => e.uri === prop.rangeUri)?.label || ''
      : prop.rangeUri?.split('#')?.pop() || prop.rangeUri || '',
  }
}

// CRUD
const handleAddEntity = async () => {
  if (!entityForm.value.uri || !entityForm.value.label) {
    ElMessage.warning('URI 和名称必填')
    return
  }
  try {
    await classApi.create(ontologyId, entityForm.value)
    ElMessage.success('实体创建成功')
    showAddEntityDialog.value = false
    entityForm.value = { uri: '', label: '', comment: '', parentUri: '' }
    await refreshAll()
  } catch (e) {
    ElMessage.error('创建实体失败')
  }
}

const handleAddAttr = async () => {
  if (!attrForm.value.uri || !attrForm.value.label) {
    ElMessage.warning('URI 和名称必填')
    return
  }
  try {
    await propertyApi.create(ontologyId, attrForm.value)
    ElMessage.success(`${attrForm.value.type === 'DATA_PROPERTY' ? '属性' : '关系'}创建成功`)
    showAddAttrDialog.value = false
    attrForm.value = { uri: '', label: '', type: 'DATA_PROPERTY', domainUri: '', rangeUri: '' }
    await refreshAll()
  } catch (e) {
    ElMessage.error('创建失败')
  }
}

const handleDeleteSelected = async () => {
  if (!selectedNode.value) return
  try {
    if (selectedNode.value.type === 'CLASS') {
      await classApi.delete(ontologyId, selectedNode.value.uri)
    } else {
      await propertyApi.delete(ontologyId, selectedNode.value.uri)
    }
    ElMessage.success('删除成功')
    selectedNode.value = null
    await refreshAll()
  } catch (e) {
    ElMessage.error('删除失败')
  }
}

const handleExport = async () => {
  try {
    const res = await ontologyApi.export(ontologyId)
    const blob = new Blob([res.data], { type: 'application/rdf+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ontology.rdf'
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    ElMessage.error('导出失败')
  }
}

const handleGraphExport = async (format: string) => {
  if (!graph || !graphContainer.value) return
  try {
    if (format === 'svg') {
      const svgEl = graphContainer.value.querySelector('svg')
      if (svgEl) {
        const serializer = new XMLSerializer()
        const svgStr = serializer.serializeToString(svgEl)
        const blob = new Blob([svgStr], { type: 'image/svg+xml' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'ontology-graph.svg'
        a.click()
        URL.revokeObjectURL(url)
        ElMessage.success('图谱已导出为 SVG')
      }
    } else {
      const dataURL = await graph.toDataURL({ type: 'image/png' })
      const a = document.createElement('a')
      a.href = dataURL
      a.download = 'ontology-graph.png'
      a.click()
      ElMessage.success('图谱已导出为 PNG')
    }
  } catch (e) {
    ElMessage.error('导出图谱失败')
  }
}

const handleSparql = async () => {
  if (!sparqlQuery.value) return
  try {
    const res = await sparqlApi.execute(ontologyId, sparqlQuery.value)
    sparqlResult.value = res.data
  } catch (e) {
    ElMessage.error('SPARQL 查询失败')
  }
}

onMounted(async () => {
  await nextTick()
  await refreshAll()
})
</script>

<style scoped>
.ontology-editor {
  height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
  background: #f0f2f5;
  padding: 12px;
}

.toolbar {
  padding: 10px 16px;
  background: #fff;
  border-radius: 8px;
  margin-bottom: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.toolbar-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f1f1f;
}

.editor-content {
  flex: 1;
  display: flex;
  gap: 12px;
  overflow: hidden;
}

/* Left Panel - Palette */
.left-panel {
  width: 240px;
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  overflow: auto;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
}

.panel-hint {
  font-size: 12px;
  color: #bfbfbf;
  margin: 0 0 12px 0;
}

.palette-section {
  margin-bottom: 16px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #595959;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.section-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
}

.entity-icon { background: #5B8FF9; }
.attr-icon { background: #5AD8A6; }
.rel-icon { background: #F6BD16; }

.palette-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  margin-bottom: 4px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.palette-item:hover {
  background: #f5f7fa;
  border-color: #e8e8e8;
}

.palette-item.active {
  background: #e6f4ff;
  border-color: #91d5ff;
}

.palette-entity { cursor: grab; }
.palette-entity:active { cursor: grabbing; }

.item-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.palette-entity .item-icon { background: #5B8FF9; }
.palette-attr .item-icon { background: #5AD8A6; }
.palette-rel .item-icon { background: #F6BD16; }

.item-label {
  font-size: 13px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-hint {
  font-size: 12px;
  color: #d9d9d9;
  padding: 8px 0;
  text-align: center;
}

/* Center Panel - Graph */
.center-panel {
  flex: 1;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  position: relative;
}

.graph-container {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #fafbfc 0%, #f5f6f8 100%);
}

.graph-legend {
  position: absolute;
  bottom: 16px;
  left: 16px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  border-radius: 8px;
  padding: 10px 14px;
  display: flex;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #f0f0f0;
  z-index: 10;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #595959;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  display: inline-block;
}

.legend-dot-entity {
  background: #5B8FF9;
  border: 2px solid #3B6FD9;
}

.legend-dot-attr {
  background: #f0f5ff;
  border: 2px solid #adc6ff;
}

.legend-dot-rel {
  background: #fffbe6;
  border: 2px solid #ffe58f;
}

.legend-line {
  width: 20px;
  height: 2px;
  display: inline-block;
  position: relative;
}

.legend-line::after {
  content: '';
  position: absolute;
  right: -2px;
  top: -3px;
  width: 0;
  height: 0;
  border-left: 6px solid currentColor;
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
}

.legend-line-rel {
  background: #8c8c8c;
  color: #8c8c8c;
}

.legend-line-sub {
  background: #d9d9d9;
  color: #d9d9d9;
}

.connect-mode-hint {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: #fff2f0;
  border: 1px solid #ffccc7;
  color: #cf1322;
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  z-index: 10;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* Right Panel - Details */
.right-panel {
  width: 280px;
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  overflow: auto;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
}

.detail-section {
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.detail-card {
  border-radius: 8px;
  padding: 14px;
  margin-bottom: 12px;
}

.entity-card {
  background: linear-gradient(135deg, #e6f4ff 0%, #bae0ff 100%);
  border: 1px solid #91d5ff;
}

.attr-card {
  background: linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%);
  border: 1px solid #b7eb8f;
}

.detail-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #fff;
}

.badge-entity { background: #5B8FF9; }
.badge-attr { background: #5AD8A6; }
.badge-rel { background: #F6BD16; color: #333; }

.detail-name {
  font-size: 16px;
  font-weight: 600;
  color: #1f1f1f;
  margin-bottom: 4px;
}

.detail-uri {
  font-size: 11px;
  color: #8c8c8c;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-subtitle {
  font-size: 12px;
  font-weight: 600;
  color: #595959;
  margin: 12px 0 8px 0;
}

.attr-row, .rel-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  margin-bottom: 4px;
  background: #fafafa;
  border-radius: 4px;
  font-size: 12px;
}

.rel-target {
  color: #8c8c8c;
  margin-left: auto;
  font-size: 11px;
}

.detail-meta {
  font-size: 13px;
  padding: 6px 0;
  color: #595959;
}

.meta-label {
  font-weight: 600;
  color: #333;
}

.empty-tip {
  color: #bfbfbf;
  font-size: 13px;
  margin-top: 20px;
  text-align: center;
}

h3 {
  margin: 0 0 12px 0;
  font-size: 15px;
  font-weight: 600;
  color: #1f1f1f;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

/* SPARQL Editor */
.sparql-editor-wrapper {
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  overflow: hidden;
}

.sparql-editor {
  display: flex;
  font-family: ui-monospace, Consolas, monospace;
  font-size: 13px;
  line-height: 1.5;
}

.sparql-line-numbers {
  display: flex;
  flex-direction: column;
  padding: 8px 8px 8px 12px;
  background: #f5f7fa;
  color: #909399;
  text-align: right;
  user-select: none;
  min-width: 40px;
}

.sparql-input-area {
  flex: 1;
  position: relative;
}

.sparql-highlight {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 8px 12px;
  pointer-events: none;
  white-space: pre-wrap;
  word-wrap: break-word;
  color: transparent;
}

.sparql-highlight :deep(.sp-keyword) { color: #409eff; font-weight: bold; }
.sparql-highlight :deep(.sp-var) { color: #e6a23c; }
.sparql-highlight :deep(.sp-uri) { color: #67c23a; }
.sparql-highlight :deep(.sp-string) { color: #f56c6c; }
.sparql-highlight :deep(.sp-comment) { color: #909399; font-style: italic; }

.sparql-textarea {
  width: 100%;
  border: none;
  outline: none;
  resize: none;
  padding: 8px 12px;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  background: transparent;
  color: #303133;
  position: relative;
  z-index: 1;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>

<style>
/* UML Card styles for HTML nodes (must be non-scoped) */
.uml-card {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.uml-card .attr-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3px 0;
  font-size: 12px;
  line-height: 1.4;
}
.uml-card .attr-name {
  color: #333;
  font-weight: 500;
}
.uml-card .attr-type {
  color: #bfbfbf;
  font-size: 11px;
  font-family: ui-monospace, Consolas, monospace;
  text-transform: uppercase;
}
</style>
