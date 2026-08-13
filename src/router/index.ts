import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/modeling',
    },
    {
      path: '/modeling',
      name: 'OntologyList',
      component: () => import('../pages/modeling/OntologyList.vue'),
    },
    {
      path: '/modeling/editor/:id',
      name: 'OntologyEditor',
      component: () => import('../pages/modeling/OntologyEditor.vue'),
      props: true,
    },
    {
      path: '/intelligence/chat',
      name: 'AiChat',
      component: () => import('../pages/intelligence/AiChat.vue'),
    },
    {
      path: '/intelligence/extract',
      name: 'KnowledgeExtract',
      component: () => import('../pages/intelligence/KnowledgeExtract.vue'),
    },
    {
      path: '/intelligence/reasoning',
      name: 'ReasoningTools',
      component: () => import('../pages/intelligence/ReasoningTools.vue'),
    },
  ],
})

export default router
