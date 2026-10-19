<script setup lang="ts">
defineProps<{
  visible: boolean;
  title: string;
  description: string;
}>();

defineEmits<{
  close: [];
}>();
</script>

<template>
  <div v-if="visible" class="dialog-backdrop">
    <section
      class="dialog-card"
      role="dialog"
      aria-modal="true"
    >
      <h2>{{ title }}</h2>
      <p>{{ description }}</p>

      <button type="button" @click="$emit('close')">
        Tutup
      </button>
    </section>
  </div>
</template>
