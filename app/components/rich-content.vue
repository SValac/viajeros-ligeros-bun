<script setup lang="ts">
import DOMPurify from 'dompurify';

const props = defineProps<{
  html?: string;
  class?: string;
}>();

const safeHtml = computed(() =>
  props.html ? DOMPurify.sanitize(props.html) : '',
);
</script>

<template>
  <div
    class="rich-content"
    :class="props.class"
    v-html="safeHtml"
  />
</template>

<style scoped>
.rich-content :deep(ul) {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin: 0.25rem 0;
}
.rich-content :deep(ol) {
  list-style-type: decimal;
  padding-left: 1.5rem;
  margin: 0.25rem 0;
}
.rich-content :deep(li) {
  margin: 0.1rem 0;
}
.rich-content :deep(strong) {
  font-weight: 700;
}
.rich-content :deep(em) {
  font-style: italic;
}
.rich-content :deep(u) {
  text-decoration: underline;
}
.rich-content :deep(s) {
  text-decoration: line-through;
}
.rich-content :deep(p) {
  margin: 0.15rem 0;
}
.rich-content :deep(p:empty),
.rich-content :deep(p:has(> br:only-child)) {
  min-height: 1em;
}
.rich-content :deep(a) {
  color: var(--ui-primary);
  text-decoration: underline;
  cursor: pointer;
}
.rich-content :deep(a:hover) {
  opacity: 0.8;
}
</style>
