import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

// Route definitions
const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/Login.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/map',
      },
      {
        path: 'map',
        name: 'map',
        component: () => import('@/pages/Dashboard.vue'),
        meta: { permission: 'map:read' },
      },
      {
        path: 'history',
        name: 'history',
        component: () => import('@/pages/History.vue'),
        meta: { permission: 'history:read' },
      },
      {
        path: 'reports',
        name: 'reports',
        component: () => import('@/pages/Reports.vue'),
        meta: { permission: 'reports:read' },
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/pages/Settings.vue'),
        meta: { permission: 'settings:read' },
      },
      {
        path: 'vehicles',
        name: 'vehicles',
        component: () => import('@/pages/Vehicles.vue'),
        meta: { permission: 'vehicles:read' },
      },
      {
        path: 'drivers',
        name: 'drivers',
        component: () => import('@/pages/Drivers.vue'),
        meta: { permission: 'drivers:read' },
      },
      {
        path: 'devices',
        name: 'devices',
        component: () => import('@/pages/Devices.vue'),
        meta: { permission: 'devices:read' },
      },
      {
        path: 'engine-events',
        name: 'engine-events',
        component: () => import('@/pages/EngineEvents.vue'),
        meta: { permission: 'engine-events:read' },
      },
      {
        path: 'users',
        name: 'users',
        component: () => import('@/pages/Users.vue'),
        meta: { permission: 'users:read' },
      },
      {
        path: 'roles',
        name: 'roles',
        component: () => import('@/pages/Roles.vue'),
        meta: { permission: 'roles:read' },
      },
      {
        path: 'no-access',
        name: 'no-access',
        component: () => import('@/pages/NoAccess.vue'),
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/map',
  },
]

// Create router instance
const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Navigation guard for authentication
router.beforeEach(async (to, _from, next) => {
  const auth = useAuthStore()
  const token = localStorage.getItem('access_token')
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth !== false)

  if (requiresAuth && !token) {
    // Redirect to login if auth required but no token
    return next({ name: 'login' })
  }

  if (to.name === 'login' && token) {
    // Redirect to dashboard if already logged in
    return next({ name: auth.landingRoute() })
  }

  // Sahifa yangilangandan keyin rol o'zgargan bo'lishi mumkin — ilova yuklanganda bir marta.
  if (requiresAuth && token && !auth.bootstrapped) {
    const ok = await auth.fetchMe()
    if (!ok) return next({ name: 'login' })
  }

  const required = to.matched.find((r) => r.meta.permission)?.meta.permission as
    | string
    | undefined

  if (required && !auth.can(required)) {
    return next({ name: auth.landingRoute() })
  }

  next()
})

export default router
