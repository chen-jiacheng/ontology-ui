<template>
  <div class="extract-page">
    <div class="page-header">
      <h2>Knowledge Extraction</h2>
    </div>

    <el-card>
      <el-form>
        <el-form-item label="Select Ontology">
          <el-select v-model="selectedOntologyId" placeholder="Optional" clearable style="width: 300px">
            <el-option v-for="ont in ontologies" :key="ont.id" :label="ont.name" :value="ont.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="Input Text">
          <el-input
            v-model="inputText"
            type="textarea"
            rows="6"
            placeholder="Enter text to extract entities and relations from..."
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleExtract" :loading="extracting">Extract</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <div v-if="extractResult" class="result-section">
      <el-row :gutter="20">
        <el-col :span="12">
          <el-card>
            <template #header>
              <span>Entities ({{ extractResult.entities.length }})</span>
            </template>
            <el-table :data="extractResult.entities" size="small">
              <el-table-column prop="name" label="Name" />
              <el-table-column prop="type" label="Type" width="120" />
              <el-table-column prop="description" label="Description" />
            </el-table>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card>
            <template #header>
              <span>Relations ({{ extractResult.relations.length }})</span>
            </template>
            <el-table :data="extractResult.relations" size="small">
              <el-table-column prop="source" label="Source" />
              <el-table-column prop="relation" label="Relation" width="120" />
              <el-table-column prop="target" label="Target" />
            </el-table>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { ontologyApi, llmApi } from '../../api'

const ontologies = ref<any[]>([])
const selectedOntologyId = ref('')
const inputText = ref('')
const extracting = ref(false)
const extractResult = ref<any>(null)

const handleExtract = async () => {
  if (!inputText.value.trim()) {
    ElMessage.warning('Please enter text')
    return
  }
  extracting.value = true
  try {
    const res = await llmApi.extract(inputText.value, selectedOntologyId.value || undefined)
    extractResult.value = res.data
    ElMessage.success('Extraction complete')
  } catch (e) {
    ElMessage.error('Extraction failed. Make sure LLM API key is configured.')
  } finally {
    extracting.value = false
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
.extract-page {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
}

.result-section {
  margin-top: 20px;
}
</style>
