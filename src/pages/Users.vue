<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUsersStore, type AppUser, type CreateUserDto } from '@/stores/users.store'
import { useRolesStore } from '@/stores/roles.store'
import { useAuthStore } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import Dialog from '@/components/ui/Dialog.vue'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Plus, Pencil, Trash2, ChevronLeft, ChevronRight,
  Loader2, Users as UsersIcon, User, MoreVertical, ShieldCheck,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { formatDate } from '@/lib/utils'

const { t } = useI18n()
const usersStore = useUsersStore()
const rolesStore = useRolesStore()
const auth = useAuthStore()

const pageSize = ref(Number(localStorage.getItem('users_pageSize')) || 10)

function changePageSize(size: number) {
  pageSize.value = size
  localStorage.setItem('users_pageSize', String(size))
  usersStore.setPageSize(size)
}

const isFormDialogOpen = ref(false)
const isDeleteDialogOpen = ref(false)
const isEditing = ref(false)
const selectedUser = ref<AppUser | null>(null)

const formData = ref<CreateUserDto>({ name: '', email: '', password: '', roleId: 0 })

function resetForm() {
  formData.value = { name: '', email: '', password: '', roleId: rolesStore.roles[0]?.id ?? 0 }
}

function openCreateDialog() {
  resetForm()
  isEditing.value = false
  isFormDialogOpen.value = true
}

function openEditDialog(user: AppUser) {
  selectedUser.value = user
  // Parol bo'sh qoldirilsa o'zgarmaydi.
  formData.value = { name: user.name, email: user.email, password: '', roleId: user.roleId }
  isEditing.value = true
  isFormDialogOpen.value = true
}

function openDeleteDialog(user: AppUser) {
  selectedUser.value = user
  isDeleteDialogOpen.value = true
}

async function handleSubmit() {
  if (isEditing.value && selectedUser.value) {
    const payload: Record<string, unknown> = {
      name: formData.value.name,
      email: formData.value.email,
      roleId: formData.value.roleId,
    }
    if (formData.value.password) payload.password = formData.value.password

    const ok = await usersStore.updateUser(selectedUser.value.id, payload)
    if (ok) {
      toast.success(t('user.updateSuccess'))
      isFormDialogOpen.value = false
      resetForm()
    }
  } else {
    const ok = await usersStore.createUser(formData.value)
    if (ok) {
      toast.success(t('user.createSuccess'))
      isFormDialogOpen.value = false
      resetForm()
    }
  }
}

async function handleDelete() {
  if (!selectedUser.value) return
  const ok = await usersStore.deleteUser(selectedUser.value.id)
  if (ok) {
    toast.success(t('user.deleteSuccess'))
    isDeleteDialogOpen.value = false
    selectedUser.value = null
  }
}

const visiblePages = computed(() => {
  const total = usersStore.totalPages || 1
  const current = usersStore.currentPage
  const pages: number[] = []

  if (total <= 5) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else if (current <= 3) {
    pages.push(1, 2, 3, 4, 5)
  } else if (current >= total - 2) {
    pages.push(total - 4, total - 3, total - 2, total - 1, total)
  } else {
    pages.push(current - 2, current - 1, current, current + 1, current + 2)
  }

  return pages.filter((p) => p >= 1 && p <= total)
})

const canEdit = computed(() => auth.can('users:edit'))
const canDelete = computed(() => auth.can('users:delete'))
const isFormValid = computed(
  () =>
    formData.value.name.trim() !== '' &&
    formData.value.email.trim() !== '' &&
    formData.value.roleId > 0 &&
    (isEditing.value || formData.value.password.length >= 6),
)

onMounted(async () => {
  usersStore.setPageSize(pageSize.value)
  // Rollar select uchun kerak — roles:read bo'lmasa ro'yxat bo'sh qoladi.
  if (auth.canAny('roles:read')) await rolesStore.fetchRoles()
})
</script>

<template>
  <div class="h-full flex flex-col p-4 md:p-6">
    <!-- Header -->
    <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4 md:mb-6">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <UsersIcon class="h-5 w-5 text-primary" />
        </div>
        <h1 class="text-xl md:text-2xl font-bold">{{ t('user.title') }}</h1>
      </div>

      <Button v-if="canEdit" class="h-10 md:h-9" @click="openCreateDialog">
        <Plus class="h-4 w-4 mr-2" />
        {{ t('user.add') }}
      </Button>
    </div>

    <!-- Table -->
    <Card class="flex-1 flex flex-col overflow-hidden relative">
      <div
        v-if="usersStore.loading"
        class="absolute inset-0 bg-background/60 z-10 flex items-center justify-center"
      >
        <div class="flex flex-col items-center gap-2">
          <Loader2 class="h-8 w-8 animate-spin text-primary" />
          <span class="text-sm text-muted-foreground">{{ t('common.loading') }}</span>
        </div>
      </div>

      <div class="flex-1 overflow-auto table-scroll">
        <table class="w-full min-w-[760px] md:min-w-0 table-fixed">
          <thead class="bg-muted sticky top-0 z-[5]">
            <tr>
              <th class="text-center px-4 py-3 font-medium text-sm w-[52px] min-w-[52px]">#</th>
              <th class="text-left px-4 py-3 font-medium text-sm w-[64px] min-w-[64px] md:w-[80px]">ID</th>
              <th class="text-left px-4 py-3 font-medium text-sm w-[210px] min-w-[210px] md:w-auto">{{ t('user.name') }}</th>
              <th class="text-left px-4 py-3 font-medium text-sm w-[240px] min-w-[240px]">{{ t('user.email') }}</th>
              <th class="text-left px-4 py-3 font-medium text-sm w-[150px] min-w-[150px]">{{ t('user.role') }}</th>
              <th class="text-left px-4 py-3 font-medium text-sm w-[120px] min-w-[120px]">{{ t('user.createdAt') }}</th>
              <th class="text-center px-4 py-3 font-medium text-sm w-[80px] min-w-[80px] md:w-[100px]">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="(u, index) in usersStore.users" :key="u.id" class="hover:bg-muted/30 transition-colors">
              <td class="px-4 py-3 text-sm text-center text-muted-foreground">{{ (usersStore.currentPage - 1) * pageSize + index + 1 }}</td>
              <td class="px-4 py-3 text-sm">{{ u.id }}</td>
              <td class="px-4 py-3 text-sm">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User class="h-4 w-4 text-primary" />
                  </div>
                  <span class="font-medium">{{ u.name }}</span>
                </div>
              </td>
              <td class="px-4 py-3 text-sm text-muted-foreground">{{ u.email }}</td>
              <td class="px-4 py-3 text-sm">
                <Badge variant="default" class="gap-1">
                  <ShieldCheck class="h-3 w-3" />
                  {{ u.roleName }}
                </Badge>
              </td>
              <td class="px-4 py-3 text-sm text-muted-foreground">{{ formatDate(u.createdAt) }}</td>
              <td class="px-4 py-3">
                <div class="flex justify-center">
                  <DropdownMenu v-if="canEdit || canDelete">
                    <DropdownMenuTrigger as-child>
                      <button class="h-10 w-10 md:h-8 md:w-8 rounded-lg border border-input flex items-center justify-center hover:bg-accent transition-colors">
                        <MoreVertical class="h-4 w-4 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem v-if="canEdit" class="gap-2 cursor-pointer" @click="openEditDialog(u)">
                        <Pencil class="h-4 w-4" />
                        {{ t('common.edit') }}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        v-if="canDelete && u.id !== auth.currentUser?.id"
                        class="gap-2 cursor-pointer text-destructive focus:text-destructive"
                        @click="openDeleteDialog(u)"
                      >
                        <Trash2 class="h-4 w-4" />
                        {{ t('common.delete') }}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <span v-else class="text-muted-foreground">-</span>
                </div>
              </td>
            </tr>

            <tr v-if="usersStore.users.length === 0 && !usersStore.loading">
              <td colspan="7" class="px-4 py-12 text-center text-muted-foreground">
                {{ t('user.noUsers') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-3 md:px-4 py-3 border-t border-border bg-muted/30 flex-shrink-0">
        <div class="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{{ t('common.total') }}: <strong class="text-foreground">{{ usersStore.totalUsers }}</strong></span>
          <select
            :value="pageSize"
            class="h-8 rounded-md border border-input bg-background px-2 text-sm"
            @change="changePageSize(Number(($event.target as HTMLSelectElement).value))"
          >
            <option v-for="s in [10, 20, 50, 100]" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>

        <div class="flex items-center gap-1">
          <button
            class="h-8 w-8 rounded-md border border-input flex items-center justify-center disabled:opacity-40"
            :disabled="!usersStore.meta.hasPrev"
            @click="usersStore.fetchUsers(usersStore.currentPage - 1, pageSize)"
          >
            <ChevronLeft class="h-4 w-4" />
          </button>
          <button
            v-for="p in visiblePages"
            :key="p"
            class="h-8 min-w-8 px-2 rounded-md border text-sm"
            :class="p === usersStore.currentPage ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-accent'"
            @click="usersStore.fetchUsers(p, pageSize)"
          >
            {{ p }}
          </button>
          <button
            class="h-8 w-8 rounded-md border border-input flex items-center justify-center disabled:opacity-40"
            :disabled="!usersStore.meta.hasNext"
            @click="usersStore.fetchUsers(usersStore.currentPage + 1, pageSize)"
          >
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>

    <!-- Create / Edit dialog -->
    <Dialog v-model:open="isFormDialogOpen" :title="isEditing ? t('user.edit') : t('user.add')">
      <div class="space-y-4">
        <div class="space-y-2">
          <Label>{{ t('user.name') }}</Label>
          <Input v-model="formData.name" :placeholder="t('user.namePlaceholder')" />
        </div>
        <div class="space-y-2">
          <Label>{{ t('user.email') }}</Label>
          <Input v-model="formData.email" type="email" placeholder="user@example.com" />
        </div>
        <div class="space-y-2">
          <Label>{{ isEditing ? t('user.passwordOptional') : t('user.password') }}</Label>
          <Input v-model="formData.password" type="password" placeholder="••••••••" />
        </div>
        <div class="space-y-2">
          <Label>{{ t('user.role') }}</Label>
          <select
            v-model.number="formData.roleId"
            class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option v-for="r in rolesStore.roles" :key="r.id" :value="r.id">{{ r.name }}</option>
          </select>
        </div>
      </div>

      <div class="flex justify-end gap-2 mt-6">
        <Button variant="outline" @click="isFormDialogOpen = false">
          {{ t('common.cancel') }}
        </Button>
        <Button :disabled="!isFormValid || usersStore.loading" @click="handleSubmit">
          <Loader2 v-if="usersStore.loading" class="h-4 w-4 mr-2 animate-spin" />
          {{ t('common.save') }}
        </Button>
      </div>
    </Dialog>

    <!-- Delete dialog -->
    <Dialog v-model:open="isDeleteDialogOpen" :title="t('user.deleteTitle')">
      <p class="text-sm text-muted-foreground mb-4">{{ t('user.deleteConfirm') }}</p>
      <p class="font-medium">{{ selectedUser?.name }}</p>

      <div class="flex justify-end gap-2 mt-6">
        <Button variant="outline" @click="isDeleteDialogOpen = false">
          {{ t('common.cancel') }}
        </Button>
        <Button variant="destructive" :disabled="usersStore.loading" @click="handleDelete">
          <Loader2 v-if="usersStore.loading" class="h-4 w-4 mr-2 animate-spin" />
          {{ t('common.delete') }}
        </Button>
      </div>
    </Dialog>
  </div>
</template>
