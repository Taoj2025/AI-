// ============================================================
// Zustand 全局状态管理
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// -------- 认证 Store --------
interface AuthState {
  token: string | null;
  user: { id: string; email: string; name: string; subscription: string } | null;
  isAuthenticated: boolean;
  login: (token: string, user: AuthState['user']) => void;
  logout: () => void;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      login: (token, user) => set({ token, user, isAuthenticated: true }),
      logout: () => set({ token: null, user: null, isAuthenticated: false }),
      setToken: (token) => set({ token, isAuthenticated: !!token }),
    }),
    { name: 'resumeai-auth' }
  )
);

// -------- 简历 Store --------
interface ResumeState {
  resumes: any[];
  currentResume: any | null;
  loading: boolean;
  fetchResumes: (token: string) => Promise<void>;
  createResume: (token: string, data: any) => Promise<any>;
  updateResume: (token: string, id: string, data: any) => Promise<void>;
  deleteResume: (token: string, id: string) => Promise<void>;
  setCurrentResume: (resume: any) => void;
}

export const useResumeStore = create<ResumeState>((set, get) => ({
  resumes: [],
  currentResume: null,
  loading: false,

  fetchResumes: async (token) => {
    set({ loading: true });
    try {
      const res = await fetch(`${API_BASE}/api/resumes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      set({ resumes: json.data ?? [], loading: false });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },

  createResume: async (token, data) => {
    const res = await fetch(`${API_BASE}/api/resumes`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json.success) {
      set((state) => ({ resumes: [json.data, ...state.resumes] }));
    }
    return json;
  },

  updateResume: async (token, id, data) => {
    const res = await fetch(`${API_BASE}/api/resumes/${id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json.success) {
      set((state) => ({
        resumes: state.resumes.map((r) => (r.id === id ? json.data : r)),
        currentResume: state.currentResume?.id === id ? json.data : state.currentResume,
      }));
    }
  },

  deleteResume: async (token, id) => {
    await fetch(`${API_BASE}/api/resumes/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    set((state) => ({
      resumes: state.resumes.filter((r) => r.id !== id),
      currentResume: state.currentResume?.id === id ? null : state.currentResume,
    }));
  },

  setCurrentResume: (resume) => set({ currentResume: resume }),
}));

// -------- API 基础地址 --------
const API_BASE = __DEV__
  ? 'http://localhost:3000'   // 开发环境 -> API Gateway
  : 'https://api.resumeai.com'; // 生产环境
