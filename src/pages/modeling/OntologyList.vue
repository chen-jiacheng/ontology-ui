<template>
  <div class="ontology-list-page">
    <div class="page-header">
      <h2>Ontology List</h2>
      <div class="actions">
        <el-button type="primary" @click="showCreateDialog = true">Create Ontology</el-button>
        <el-button @click="showImportDialog = true">Import OWL</el-button>
      </div>
    </div>

    <el-table :data="ontologies" v-loading="loading" stripe>
      <el-table-column prop="name" label="Name" />
      <el-table-column prop="namespace" label="Namespace" />
      <el-table-column prop="description" label="Description" />
      <el-table-column prop="createdAt" label="Created" width="180">
        <template #default="{ row }">
          {{ new Date(row.createdAt).toLocaleString() }}
        </template>
      </el-table-column>
      <el-table-column label="Actions" width="200">
        <template #default="{ row }">
          <el-button type="primary" link @click="openEditor(row)">Edit</el-button>
          <el-button type="danger" link @click="handleDelete(row)">Delete</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- Create Dialog -->
    <el-dialog v-model="showCreateDialog" title="Create Ontology" width="500px">
      <el-form :model="createForm" label-width="100px">
        <el-form-item label="Name" required>
          <el-input v-model="createForm.name" placeholder="e.g., My Ontology" />
        </el-form-item>
        <el-form-item label="Namespace" required>
          <el-input v-model="createForm.namespace" placeholder="e.g., http://example.org/ontology#" />
        </el-form-item>
        <el-form-item label="Description">
          <el-input v-model="createForm.description" type="textarea" rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">Cancel</el-button>
        <el-button type="primary" @click="handleCreate" :loading="creating">Create</el-button>
      </template>
    </el-dialog>

    <!-- Import Dialog -->
    <el-dialog v-model="showImportDialog" title="Import Ontology" width="500px">
      <el-form :model="importForm" label-width="100px">
        <el-form-item label="Name" required>
          <el-input v-model="importForm.name" placeholder="Ontology name" />
        </el-form-item>
        <el-form-item label="Namespace" required>
          <el-input v-model="importForm.namespace" placeholder="http://example.org/ontology#" />
        </el-form-item>
        <el-form-item label="File" required>
          <el-upload
            :auto-upload="false"
            :limit="1"
            accept=".owl,.rdf,.ttl,.nt"
            :on-change="(file: any) => importForm.file = file.raw"
          >
            <el-button>Select File</el-button>
          </el-upload>
        </el-form-item>
        <el-form-item label="Format">
          <el-select v-model="importForm.format">
            <el-option label="RDF/XML" value="RDF/XML" />
            <el-option label="Turtle" value="Turtle" />
            <el-option label="N-Triple" value="N-TRIPLE" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showImportDialog = false">Cancel</el-button>
        <el-button type="primary" @click="handleImport" :loading="importing">Import</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ontologyApi } from '../../api'

const router = useRouter()
const loading = ref(false)
const creating = ref(false)
const importing = ref(false)
const ontologies = ref<any[]>([])
const showCreateDialog = ref(false)
const showImportDialog = ref(false)

const createForm = ref({ name: '', namespace: '', description: '' })
const importForm = ref({ name: '', namespace: '', file: null as File | null, format: 'RDF/XML' })

const fetchOntologies = async () => {
  loading.value = true
  try {
    const res = await ontologyApi.list()
    ontologies.value = res.data
  } catch (e) {
    ElMessage.error('Failed to load ontologies')
  } finally {
    loading.value = false
  }
}

const handleCreate = async () => {
  if (!createForm.value.name || !createForm.value.namespace) {
    ElMessage.warning('Name and namespace are required')
    return
  }
  creating.value = true
  try {
    await ontologyApi.create(createForm.value)
    ElMessage.success('Ontology created')
    showCreateDialog.value = false
    createForm.value = { name: '', namespace: '', description: '' }
    await fetchOntologies()
  } catch (e) {
    ElMessage.error('Failed to create ontology')
  } finally {
    creating.value = false
  }
}

const handleImport = async () => {
  if (!importForm.value.name || !importForm.value.namespace || !importForm.value.file) {
    ElMessage.warning('All fields are required')
    return
  }
  importing.value = true
  try {
    const formData = new FormData()
    formData.append('file', importForm.value.file)
    formData.append('name', importForm.value.name)
    formData.append('namespace', importForm.value.namespace)
    formData.append('format', importForm.value.format)
    await ontologyApi.import(formData)
    ElMessage.success('Ontology imported')
    showImportDialog.value = false
    importForm.value = { name: '', namespace: '', file: null, format: 'RDF/XML' }
    await fetchOntologies()
  } catch (e) {
    ElMessage.error('Failed to import ontology')
  } finally {
    importing.value = false
  }
}

const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm(`Delete ontology "${row.name}"?`, 'Confirm')
    await ontologyApi.delete(row.id)
    ElMessage.success('Deleted')
    await fetchOntologies()
  } catch (e) {
    // cancelled
  }
}

const openEditor = (row: any) => {
  router.push(`/modeling/editor/${row.id}`)
}

onMounted(fetchOntologies)
</script>

<style scoped>
.ontology-list-page {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
}
</style>
