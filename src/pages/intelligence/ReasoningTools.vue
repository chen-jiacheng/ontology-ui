<template>
  <div class="reasoning-page">
    <div class="page-header">
      <h2>Reasoning Tools</h2>
    </div>

    <el-card style="margin-bottom: 20px">
      <el-form inline>
        <el-form-item label="Select Ontology">
          <el-select v-model="selectedOntologyId" placeholder="Select ontology" style="width: 300px">
            <el-option v-for="ont in ontologies" :key="ont.id" :label="ont.name" :value="ont.id" />
          </el-select>
        </el-form-item>
      </el-form>
    </el-card>

    <el-row :gutter="20">
      <el-col :span="8">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>Auto Classification</span>
              <el-button type="primary" size="small" @click="handleClassify" :loading="classifying">
                Run
              </el-button>
            </div>
          </template>
          <p>Infer class hierarchy based on property constraints and RDFS reasoning.</p>
          <div v-if="classifyResult" class="result">
            <el-tag :type="classifyResult.success ? 'success' : 'warning'">
              {{ classifyResult.success ? 'Success' : 'Issues' }}
            </el-tag>
            <p>{{ classifyResult.message }}</p>
            <el-table v-if="classifyResult.results?.length" :data="classifyResult.results" size="small" max-height="200">
              <el-table-column prop="class" label="Class" />
              <el-table-column prop="inferredSuperClass" label="Inferred Parent" />
            </el-table>
          </div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>Consistency Check</span>
              <el-button type="primary" size="small" @click="handleConsistency" :loading="checking">
                Run
              </el-button>
            </div>
          </template>
          <p>Detect logical contradictions in the ontology using OWL reasoning.</p>
          <div v-if="consistencyResult" class="result">
            <el-tag :type="consistencyResult.success ? 'success' : 'danger'">
              {{ consistencyResult.success ? 'Consistent' : 'Inconsistent' }}
            </el-tag>
            <p>{{ consistencyResult.message }}</p>
            <el-table v-if="consistencyResult.results?.length" :data="consistencyResult.results" size="small" max-height="200">
              <el-table-column prop="type" label="Type" width="100" />
              <el-table-column prop="description" label="Description" />
            </el-table>
          </div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>Relation Inference</span>
              <el-button type="primary" size="small" @click="handleInfer" :loading="inferring">
                Run
              </el-button>
            </div>
          </template>
          <p>Derive implicit relationships based on transitivity and other rules.</p>
          <div v-if="inferResult" class="result">
            <el-tag :type="inferResult.success ? 'success' : 'warning'">
              {{ inferResult.success ? 'Success' : 'Issues' }}
            </el-tag>
            <p>{{ inferResult.message }}</p>
            <el-table v-if="inferResult.results?.length" :data="inferResult.results" size="small" max-height="200">
              <el-table-column prop="subject" label="Subject" />
              <el-table-column prop="predicate" label="Predicate" />
              <el-table-column prop="object" label="Object" />
            </el-table>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { ontologyApi, reasoningApi } from '../../api'

const ontologies = ref<any[]>([])
const selectedOntologyId = ref('')
const classifying = ref(false)
const checking = ref(false)
const inferring = ref(false)
const classifyResult = ref<any>(null)
const consistencyResult = ref<any>(null)
const inferResult = ref<any>(null)

const handleClassify = async () => {
  if (!selectedOntologyId.value) { ElMessage.warning('Select an ontology'); return }
  classifying.value = true
  try {
    const res = await reasoningApi.classify(selectedOntologyId.value)
    classifyResult.value = res.data
  } catch (e) {
    ElMessage.error('Classification failed')
  } finally {
    classifying.value = false
  }
}

const handleConsistency = async () => {
  if (!selectedOntologyId.value) { ElMessage.warning('Select an ontology'); return }
  checking.value = true
  try {
    const res = await reasoningApi.consistency(selectedOntologyId.value)
    consistencyResult.value = res.data
  } catch (e) {
    ElMessage.error('Consistency check failed')
  } finally {
    checking.value = false
  }
}

const handleInfer = async () => {
  if (!selectedOntologyId.value) { ElMessage.warning('Select an ontology'); return }
  inferring.value = true
  try {
    const res = await reasoningApi.infer(selectedOntologyId.value)
    inferResult.value = res.data
  } catch (e) {
    ElMessage.error('Inference failed')
  } finally {
    inferring.value = false
  }
}

onMounted(async () => {
  try {
    const res = await ontologyApi.list()
    ontologies.value = res.data
  } catch (e) {
    console.error(e)
  }
})
</script>

<style scoped>
.reasoning-page {
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.result {
  margin-top: 15px;
}

.result p {
  margin: 10px 0;
  font-size: 13px;
  color: #666;
}
</style>
