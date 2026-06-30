<template>
  <div>
    <div v-if="loading" class="text-grey">載入中…</div>
    <template v-else>
      <div v-if="tasks.length === 0" class="text-grey">暫無任務</div>
      <template v-else>
        <div class="row q-mb-md">
          <q-chip
            icon="check_circle"
            color="positive"
            text-color="white"
            class="q-ma-xs"
          >
            已完成 {{ completedCount }}
          </q-chip>
          <q-chip
            icon="pending"
            color="warning"
            text-color="white"
            class="q-ma-xs"
          >
            未完成 {{ pendingCount }}
          </q-chip>
          <q-chip
            icon="error"
            color="negative"
            text-color="white"
            class="q-ma-xs"
          >
            已逾期 {{ overdueCount }}
          </q-chip>
        </div>

        <div
          v-if="overdueTasks.length > 0"
          class="task-section task-section-overdue"
        >
          <div class="text-subtitle2 q-mb-sm section-title-overdue">已逾期</div>
          <q-list dense separator>
            <q-item v-for="task in overdueTasks" :key="task.id">
              <q-item-section>
                <q-item-label>{{ task.name }}</q-item-label>
                <q-item-label caption class="text-negative">
                  截止：{{ formatDate(task.deadline) }}
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </div>

        <div
          v-if="dueSoonTasks.length > 0"
          class="task-section task-section-due"
        >
          <div class="text-subtitle2 q-mb-sm section-title-due">即將到期</div>
          <q-list dense separator>
            <q-item v-for="task in dueSoonTasks" :key="task.id">
              <q-item-section>
                <q-item-label>{{ task.name }}</q-item-label>
                <q-item-label caption
                  >截止：{{ formatDate(task.deadline) }}</q-item-label
                >
              </q-item-section>
            </q-item>
          </q-list>
        </div>
        <div v-else class="text-grey">暫無即將到期的任務</div>

        <div v-if="inProgressTasks.length > 0" class="q-mt-md">
          <div class="text-subtitle2 q-mb-sm">進行中的任務</div>
          <q-list dense separator>
            <q-item v-for="task in inProgressTasks" :key="task.id">
              <q-item-section>
                <q-item-label>{{ task.name }}</q-item-label>
                <q-item-label caption>
                  截止：{{
                    task.deadline ? formatDate(task.deadline) : "無截止日"
                  }}
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </div>
        <div
          v-else-if="overdueTasks.length === 0 && dueSoonTasks.length === 0"
          class="text-grey q-mt-md"
        >
          暫無進行中的任務
        </div>
      </template>
    </template>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useTaskStore } from "@/stores/taskStore.js";

const props = defineProps({
  tasks: { type: Array, required: true },
  loading: { type: Boolean, default: false },
});

const taskStore = useTaskStore();

const overdueTasks = computed(() =>
  props.tasks
    .filter((t) => t.status !== "completed" && isOverdue(t.deadline))
    .sort((a, b) => {
      const da = new Date(a.deadline);
      const db = new Date(b.deadline);
      return (isValidDate(da) ? da : 0) - (isValidDate(db) ? db : 0);
    }),
);

const completedCount = computed(
  () => props.tasks.filter((t) => t.status === "completed").length,
);

const pendingCount = computed(
  () => props.tasks.filter((t) => t.status !== "completed").length,
);

const overdueCount = computed(
  () =>
    props.tasks.filter((t) => t.status !== "completed" && isOverdue(t.deadline))
      .length,
);

const dueSoonTasks = computed(() =>
  props.tasks
    .filter((t) => t.status !== "completed" && isDueSoon(t.deadline))
    .sort((a, b) => {
      const da = new Date(a.deadline);
      const db = new Date(b.deadline);
      return (isValidDate(da) ? da : 0) - (isValidDate(db) ? db : 0);
    }),
);

const inProgressTasks = computed(() => {
  const blockedIds = new Set(
    taskStore.getBlockedTasks(props.tasks).map((t) => t.id),
  );
  return props.tasks
    .filter(
      (t) =>
        t.status !== "completed" &&
        !blockedIds.has(t.id) &&
        !isOverdue(t.deadline) &&
        !isDueSoon(t.deadline),
    )
    .sort((a, b) => {
      const da = a.deadline ? new Date(a.deadline) : null;
      const db = b.deadline ? new Date(b.deadline) : null;
      return (
        (da && isValidDate(da) ? da : 0) - (db && isValidDate(db) ? db : 0)
      );
    });
});

function isValidDate(d) {
  return d instanceof Date && !isNaN(d);
}

function isOverdue(deadline) {
  if (!deadline) return false;
  const d = new Date(deadline);
  if (!isValidDate(d)) return false;
  return d < new Date(new Date().toDateString());
}

function isDueSoon(deadline) {
  if (!deadline) return false;
  const due = new Date(deadline);
  if (!isValidDate(due)) return false;
  const now = new Date();
  const diff = (due - now) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 7;
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (!isValidDate(d)) return "-";
  return d.toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
</script>

<style scoped>
.task-section {
  border-radius: 6px;
  padding: 8px 10px;
  margin-top: 12px;
}

.task-section-overdue {
  background-color: color-mix(in srgb, var(--q-negative) 14%, transparent);
}

.task-section-due {
  background-color: color-mix(in srgb, var(--q-warning) 18%, transparent);
}

.section-title-overdue {
  color: color-mix(in srgb, var(--q-negative) 85%, white);
}

.section-title-due {
  color: color-mix(in srgb, var(--q-warning) 80%, black);
}
</style>
