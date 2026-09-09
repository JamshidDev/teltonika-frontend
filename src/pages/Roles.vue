<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRolesStore, type Role } from '@/stores/roles.store'
import { useAuthStore } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'
import Card from '@/components/ui/Card.vue'
import Dialog from '@/components/ui/Dialog.vue'
import Switch from '@/components/ui/Switch.vue'
import { Loader2, ShieldCheck, Lock, SlidersHorizontal } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

const { t } = useI18n()
const rolesStore = useRolesStore()
const auth = useAuthStore()

const isDialogOpen = ref(false)
const selectedRole = ref<Role | null>(null)
const draft = ref<string[]>([])

const canEdit = computed(() => auth.can('roles:edit'))

function openPermissionsDialog(role: Role) {
  selectedRole.value = role
  draft.value = [...role.permissions]
  isDialogOpen.value = true
}

function toggle(key: string) {
  const i = draft.value.indexOf(key)
  if (i === -1) draft.value.push(key)
  else draft.value.splice(i, 1)
}

// Guruhning barcha amallarini birdek biriktirish/uzish.
function toggleGroup(resource: string, actions: string[]) {
  const keys = actions.map((a) => `${resource}:${a}`)
  const allOn = keys.every((k) => draft.value.includes(k))
  draft.value = allOn
    ? draft.value.filter((k) => !keys.includes(k))
    : [...new Set([...draft.value, ...keys])]
}

function isGroupFull(resource: string, actions: string[]) {
  return actions.every((a) => draft.value.includes(`${resource}:${a}`))
}

// Guruhda nechta ruxsat yoqilgan — kartochka sarlavhasida ko'rsatiladi.
function groupCount(resource: string, actions: string[]) {
  return actions.filter((a) => draft.value.includes(`${resource}:${a}`)).length
}

async function handleSave() {
  if (!selectedRole.value) return
  const ok = await rolesStore.updatePermissions(selectedRole.value.id, draft.value)
  if (ok) {
    toast.success(t('role.updateSuccess'))
    isDialogOpen.value = false
    selectedRole.value = null
  }
}

onMounted(() => {
  rolesStore.fetchRoles()
  rolesStore.fetchCatalog()
})
</script>

<template>
  <div class="h-full flex flex-col p-4 md:p-6">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-4 md:mb-6">
      <div class="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
        <ShieldCheck class="h-5 w-5 text-primary" />
      </div>
      <div>
        <h1 class="text-xl md:text-2xl font-bold">{{ t('role.title') }}</h1>
        <p class="text-xs text-muted-foreground">{{ t('role.subtitle') }}</p>
      </div>
    </div>

    <Card class="flex-1 flex flex-col overflow-hidden relative">
      <div
        v-if="rolesStore.loading"
        class="absolute inset-0 bg-background/60 z-10 flex items-center justify-center"
      >
        <Loader2 class="h-8 w-8 animate-spin text-primary" />
      </div>

      <div class="flex-1 overflow-auto table-scroll">
        <table class="w-full min-w-[720px] md:min-w-0 table-fixed">
          <thead class="bg-muted sticky top-0 z-[5]">
            <tr>
              <th class="text-center px-4 py-3 font-medium text-sm w-[52px] min-w-[52px]">#</th>
              <th class="text-left px-4 py-3 font-medium text-sm">{{ t('role.name') }}</th>
              <th class="text-left px-4 py-3 font-medium text-sm w-[170px] min-w-[170px] whitespace-nowrap">{{ t('role.userCount') }}</th>
              <th class="text-center px-4 py-3 font-medium text-sm w-[150px] min-w-[150px] whitespace-nowrap">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="(role, index) in rolesStore.roles" :key="role.id" class="hover:bg-muted/30 transition-colors">
              <td class="px-4 py-3 text-sm text-center text-muted-foreground">{{ index + 1 }}</td>
              <td class="px-4 py-3 text-sm">
                <div class="flex items-center gap-2">
                  <span class="font-medium">{{ role.name }}</span>
                  <Lock v-if="role.isSystem" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </div>
              </td>
              <td class="px-4 py-3 text-sm text-muted-foreground">{{ role.userCount ?? 0 }}</td>
              <td class="px-4 py-3">
                <div class="flex justify-center">
                  <Button
                    v-if="canEdit && !role.isSystem"
                    variant="outline"
                    size="sm"
                    @click="openPermissionsDialog(role)"
                  >
                    <SlidersHorizontal class="h-4 w-4 mr-1.5" />
                    {{ t('role.editPermissions') }}
                  </Button>
                  <span v-else class="text-xs text-muted-foreground">{{ t('role.locked') }}</span>
                </div>
              </td>
            </tr>

            <tr v-if="rolesStore.roles.length === 0 && !rolesStore.loading">
              <td colspan="4" class="px-4 py-12 text-center text-muted-foreground">
                {{ t('role.noRoles') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>

    <!-- Permission attach / detach -->
    <Dialog
      v-model:open="isDialogOpen"
      size="xxl"
      :title="`${selectedRole?.name} — ${t('role.permissions')}`"
    >
      <div class="max-h-[62vh] overflow-y-auto pr-1 -mr-1">
        <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          <!-- Har bir kartochka — bitta sahifaning ruxsatlari -->
          <div
            v-for="group in rolesStore.catalog"
            :key="group.resource"
            class="rounded-lg border border-border bg-card p-2.5 transition-colors"
            :class="groupCount(group.resource, group.actions) > 0 ? 'border-primary/40' : ''"
          >
            <div class="flex items-start justify-between gap-2 pb-2 mb-2 border-b border-border">
              <div class="min-w-0">
                <p class="text-[13px] font-semibold truncate leading-tight">{{ group.label }}</p>
                <p class="text-[10px] text-muted-foreground leading-tight">
                  {{ groupCount(group.resource, group.actions) }} / {{ group.actions.length }}
                </p>
              </div>
              <Switch
                :model-value="isGroupFull(group.resource, group.actions)"
                @update:model-value="toggleGroup(group.resource, group.actions)"
              />
            </div>

            <div class="space-y-0.5">
              <label
                v-for="action in group.actions"
                :key="action"
                class="flex items-center justify-between gap-2 rounded-md px-1.5 py-1 cursor-pointer hover:bg-accent/60 transition-colors"
              >
                <span class="text-xs">{{ t(`role.action.${action}`) }}</span>
                <Switch
                  :model-value="draft.includes(`${group.resource}:${action}`)"
                  @update:model-value="toggle(`${group.resource}:${action}`)"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      <p class="mt-1.5 text-[11px] text-muted-foreground">
        {{ t('role.selectedCount', { n: draft.length }) }}
      </p>

      <div class="flex justify-end gap-2 mt-4">
        <Button variant="outline" @click="isDialogOpen = false">
          {{ t('common.cancel') }}
        </Button>
        <Button :disabled="rolesStore.loading" @click="handleSave">
          <Loader2 v-if="rolesStore.loading" class="h-4 w-4 mr-2 animate-spin" />
          {{ t('common.save') }}
        </Button>
      </div>
    </Dialog>
  </div>
</template>
