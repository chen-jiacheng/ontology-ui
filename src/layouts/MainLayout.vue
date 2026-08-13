<template>
  <el-container class="app-layout">
    <el-header class="app-header">
      <div class="header-left">
        <h1 class="logo" @click="router.push('/')">Ontology Intelligence</h1>
      </div>
      <el-menu
        :default-active="activeMenu"
        mode="horizontal"
        class="header-menu"
        @select="handleMenuSelect"
      >
        <el-sub-menu index="modeling">
          <template #title>Modeling</template>
          <el-menu-item index="/modeling">Ontology List</el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="intelligence">
          <template #title>Intelligence</template>
          <el-menu-item index="/intelligence/chat">AI Chat</el-menu-item>
          <el-menu-item index="/intelligence/extract">Knowledge Extract</el-menu-item>
          <el-menu-item index="/intelligence/reasoning">Reasoning Tools</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-header>
    <el-main class="app-main">
      <router-view />
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const activeMenu = computed(() => route.path)

const handleMenuSelect = (index: string) => {
  router.push(index)
}
</script>

<style scoped>
.app-layout {
  height: 100vh;
}

.app-header {
  display: flex;
  align-items: center;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 20px;
}

.header-left {
  margin-right: 40px;
}

.logo {
  font-size: 20px;
  font-weight: bold;
  color: #409eff;
  cursor: pointer;
  margin: 0;
  white-space: nowrap;
}

.header-menu {
  border-bottom: none;
}

.app-main {
  background: #f5f7fa;
  padding: 20px;
  overflow: auto;
}
</style>
