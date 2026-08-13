<template>
  <div class="ai-chat-page">
    <div class="chat-container">
      <div class="chat-header">
        <h2>Ontology Intelligence Chat</h2>
        <el-select v-model="selectedOntologyId" placeholder="Select Ontology" style="width: 200px">
          <el-option
            v-for="ont in ontologies"
            :key="ont.id"
            :label="ont.name"
            :value="ont.id"
          />
        </el-select>
      </div>

      <div class="chat-messages" ref="messagesContainer">
        <div v-for="(msg, i) in messages" :key="i" :class="['message', msg.role]">
          <div class="message-content">{{ msg.content }}</div>
        </div>
        <div v-if="streaming" class="message assistant">
          <div class="message-content streaming">{{ streamContent }}<span class="cursor">|</span></div>
        </div>
      </div>

      <div class="chat-input">
        <el-input
          v-model="inputMessage"
          placeholder="Ask about the ontology..."
          @keyup.enter="handleSend"
          :disabled="streaming"
        />
        <el-button type="primary" @click="handleSend" :loading="streaming" :disabled="!inputMessage.trim()">
          Send
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { ontologyApi, llmApi } from '../../api'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const ontologies = ref<any[]>([])
const selectedOntologyId = ref('')
const messages = ref<Message[]>([])
const inputMessage = ref('')
const streaming = ref(false)
const streamContent = ref('')
const messagesContainer = ref<HTMLElement | null>(null)

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

const handleSend = async () => {
  if (!inputMessage.value.trim()) return
  if (!selectedOntologyId.value) {
    ElMessage.warning('Please select an ontology first')
    return
  }

  const userMsg = inputMessage.value.trim()
  messages.value.push({ role: 'user', content: userMsg })
  inputMessage.value = ''
  scrollToBottom()

  streaming.value = true
  streamContent.value = ''

  try {
    const response = await llmApi.chatStream(selectedOntologyId.value, userMsg)
    const reader = response.body?.getReader()
    if (reader) {
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        // Parse SSE lines
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data:')) {
            const data = line.slice(5).trim()
            if (data && data !== '[DONE]') {
              streamContent.value += data
              scrollToBottom()
            }
          } else if (line.trim() && !line.startsWith(':')) {
            streamContent.value += line
            scrollToBottom()
          }
        }
      }
    }
    messages.value.push({ role: 'assistant', content: streamContent.value })
    streamContent.value = ''
  } catch (e) {
    messages.value.push({ role: 'assistant', content: 'Error: Failed to get response. Make sure LLM API key is configured.' })
  } finally {
    streaming.value = false
    scrollToBottom()
  }
}

const fetchOntologies = async () => {
  try {
    const res = await ontologyApi.list()
    ontologies.value = res.data
    if (ontologies.value.length > 0) {
      selectedOntologyId.value = ontologies.value[0].id
    }
  } catch (e) {
    console.error(e)
  }
}

onMounted(fetchOntologies)
</script>

<style scoped>
.ai-chat-page {
  height: calc(100vh - 120px);
  display: flex;
  justify-content: center;
}

.chat-container {
  width: 800px;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #e4e7ed;
}

.chat-header h2 {
  margin: 0;
  font-size: 18px;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.message {
  margin-bottom: 15px;
  display: flex;
}

.message.user {
  justify-content: flex-end;
}

.message-content {
  max-width: 70%;
  padding: 10px 15px;
  border-radius: 12px;
  white-space: pre-wrap;
  line-height: 1.5;
}

.message.user .message-content {
  background: #409eff;
  color: #fff;
}

.message.assistant .message-content {
  background: #f0f2f5;
  color: #333;
}

.streaming .cursor {
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.chat-input {
  display: flex;
  gap: 10px;
  padding: 15px 20px;
  border-top: 1px solid #e4e7ed;
}
</style>
