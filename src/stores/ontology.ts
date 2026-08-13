import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface OntologyInfo {
  id: string
  name: string
  namespace: string
  description?: string
}

export const useOntologyStore = defineStore('ontology', () => {
  const currentOntology = ref<OntologyInfo | null>(null)
  const ontologies = ref<OntologyInfo[]>([])

  function setCurrentOntology(ontology: OntologyInfo | null) {
    currentOntology.value = ontology
  }

  function setOntologies(list: OntologyInfo[]) {
    ontologies.value = list
  }

  return { currentOntology, ontologies, setCurrentOntology, setOntologies }
})
