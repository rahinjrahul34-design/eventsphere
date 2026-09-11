import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT from zustand store
api.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('es-auth');
    const token = raw ? JSON.parse(raw)?.state?.token : null;
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {
    /* ignore */
  }
  return config;
});

// Normalize errors to human-readable messages
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const msg =
      error.response?.data?.message ||
      error.message ||
      'Something went wrong. Please try again.';
    const errors = error.response?.data?.errors || [];
    return Promise.reject(Object.assign(new Error(msg), { errors, status: error.response?.status }));
  }
);

// Thin resource helpers (components/hooks compose these with React Query)
export const fetcher = {
  get: (url, params) => api.get(url, { params }).then((r) => r.data.data),
  post: (url, body) => api.post(url, body).then((r) => r.data.data),
  put: (url, body) => api.put(url, body).then((r) => r.data.data),
  patch: (url, body) => api.patch(url, body).then((r) => r.data.data),
  del: (url) => api.delete(url).then((r) => r.data.data),
};

export const endpoints = {
  // auth
  login: (b) => fetcher.post('/auth/login', b),
  googleLogin: (b) => fetcher.post('/auth/google', b),
  register: (b) => fetcher.post('/auth/register', b),
  me: () => fetcher.get('/auth/me'),
  updateMe: (b) => fetcher.patch('/auth/me', b),
  changePassword: (b) => fetcher.post('/auth/change-password', b),
  forgotPassword: (b) => fetcher.post('/auth/forgot-password', b),
  resetPassword: (b) => fetcher.post('/auth/reset-password', b),
  applyOrganizer: (b) => fetcher.post('/auth/apply-organizer', b),

  // events
  events: (params) => fetcher.get('/events', params),
  event: (slug) => fetcher.get(`/events/slug/${slug}`),
  similar: (id) => fetcher.get(`/events/${id}/similar`),
  recommended: (params) => fetcher.get('/events/recommended', params),
  myEvents: () => fetcher.get('/events/mine'),
  createEvent: (b) => fetcher.post('/events', b),
  updateEvent: (id, b) => fetcher.put(`/events/${id}`, b),
  setEventStatus: (id, status) => fetcher.patch(`/events/${id}/status`, { status }),
  deleteEvent: (id) => fetcher.del(`/events/${id}`),
  toggleFavorite: (id) => fetcher.post(`/events/${id}/favorite`),
  favorites: () => fetcher.get('/events/favorites'),
  reportEvent: (id, b) => fetcher.post(`/events/${id}/report`, b),
  calendar: () => fetcher.get('/events/calendar'),
  ical: (id) => `/api/events/${id}/ical`,
  exportRegistrations: (id) => `/api/events/${id}/registrations/export`,

  // registration / tickets / payments
  register: (id, b) => fetcher.post(`/events/${id}/register`, b),
  verifyPayment: (b) => fetcher.post('/payments/verify', b),
  myRegistrations: () => fetcher.get('/registrations/mine'),
  cancelRegistration: (id) => fetcher.post(`/registrations/${id}/cancel`),
  eventRegistrations: (id) => fetcher.get(`/events/${id}/registrations`),
  promoteWaitlist: (id) => fetcher.post(`/waitlist/${id}/promote`),
  myTickets: () => fetcher.get('/tickets/my'),
  ticket: (code) => fetcher.get(`/tickets/${code}`),
  validateTicket: (b) => fetcher.post('/tickets/validate', b),

  // categories
  categories: () => fetcher.get('/categories'),

  // engagement
  speakers: (eventId) => fetcher.get(`/events/${eventId}/speakers`),
  createSpeaker: (eventId, b) => fetcher.post(`/events/${eventId}/speakers`, b),
  updateSpeaker: (id, b) => fetcher.put(`/speakers/${id}`, b),
  deleteSpeaker: (id) => fetcher.del(`/speakers/${id}`),
  sessions: (eventId) => fetcher.get(`/events/${eventId}/sessions`),
  createSession: (eventId, b) => fetcher.post(`/events/${eventId}/sessions`, b),
  updateSession: (id, b) => fetcher.put(`/sessions/${id}`, b),
  deleteSession: (id) => fetcher.del(`/sessions/${id}`),
  volunteers: (eventId) => fetcher.get(`/events/${eventId}/volunteers`),
  createVolunteer: (eventId, b) => fetcher.post(`/events/${eventId}/volunteers`, b),
  updateVolunteer: (id, b) => fetcher.put(`/volunteers/${id}`, b),
  deleteVolunteer: (id) => fetcher.del(`/volunteers/${id}`),
  myAssignments: () => fetcher.get('/volunteers/me'),
  mySpeaking: () => fetcher.get('/speakers/me/sessions'),
  sponsors: (eventId) => fetcher.get(`/events/${eventId}/sponsors`),
  createSponsor: (eventId, b) => fetcher.post(`/events/${eventId}/sponsors`, b),
  updateSponsor: (id, b) => fetcher.put(`/sponsors/${id}`, b),
  deleteSponsor: (id) => fetcher.del(`/sponsors/${id}`),

  // live
  liveState: (id) => fetcher.get(`/events/${id}/live`),
  announcement: (id, b) => fetcher.post(`/events/${id}/announcements`, b),
  deleteAnnouncement: (id) => fetcher.del(`/announcements/${id}`),
  createPoll: (id, b) => fetcher.post(`/events/${id}/polls`, b),
  votePoll: (pollId, b) => fetcher.post(`/polls/${pollId}/vote`, b),
  closePoll: (pollId) => fetcher.post(`/polls/${pollId}/close`),
  askQuestion: (id, b) => fetcher.post(`/events/${id}/questions`, b),
  upvoteQuestion: (qid) => fetcher.post(`/questions/${qid}/upvote`),
  answerQuestion: (qid, b) => fetcher.post(`/questions/${qid}/answer`, b),
  messages: (id) => fetcher.get(`/events/${id}/messages`),

  // notifications
  notifications: () => fetcher.get('/notifications'),
  markNotification: (id) => fetcher.post(`/notifications/${id}/read`),
  markAllNotifications: () => fetcher.post('/notifications/read-all'),

  // networking
  suggestions: () => fetcher.get('/networking/suggestions'),
  connections: () => fetcher.get('/networking/connections'),
  connect: (id) => fetcher.post(`/networking/${id}/connect`),
  respondConnection: (id, action) => fetcher.post(`/networking/connections/${id}/respond`, { action }),
  profile: (id) => fetcher.get(`/users/${id}`),
  threads: () => fetcher.get('/messages/threads'),
  dmHistory: (id) => fetcher.get(`/messages/dm/${id}`),
  sendDM: (id, text) => fetcher.post(`/messages/dm/${id}`, { text }),

  // certificates + feedback
  myCertificates: () => fetcher.get('/certificates/me'),
  verifyCertificate: (cid) => fetcher.get(`/certificates/verify/${cid}`),
  issueCertificates: (eventId, b = {}) => fetcher.post(`/events/${eventId}/certificates/issue`, b),
  eventCertificates: (eventId) => fetcher.get(`/events/${eventId}/certificates`),
  feedback: (eventId) => fetcher.get(`/events/${eventId}/feedback`),
  submitFeedback: (eventId, b) => fetcher.post(`/events/${eventId}/feedback`, b),

  // gamification
  gamification: () => fetcher.get('/gamification/me'),
  leaderboard: (eventId) => fetcher.get('/gamification/leaderboard', eventId ? { eventId } : {}),

  // analytics
  analytics: (eventId, days) => fetcher.get(`/analytics/events/${eventId}/analytics`, { days }),

  // admin
  adminStats: (days = 30) => fetcher.get('/admin/stats', { days }),
  adminUsers: (params) => fetcher.get('/admin/users', params),
  updateUser: (id, b) => fetcher.patch(`/admin/users/${id}`, b),
  adminEvents: (params) => fetcher.get('/admin/events', params),
  approveEvent: (id, b = {}) => fetcher.post(`/admin/events/${id}/approve`, b),
  rejectEvent: (id, b) => fetcher.post(`/admin/events/${id}/reject`, b),
  adminReports: () => fetcher.get('/admin/reports'),
  resolveReport: (id, b) => fetcher.patch(`/admin/reports/${id}`, b),
  createCategory: (b) => fetcher.post('/admin/categories', b),
  updateCategory: (id, b) => fetcher.put(`/admin/categories/${id}`, b),
  deleteCategory: (id) => fetcher.del(`/admin/categories/${id}`),
  auditLogs: () => fetcher.get('/admin/audit'),

  // ai
  aiPlan: (brief) => fetcher.post('/ai/plan', { brief }),
  aiGenerate: (kind, payload) => fetcher.post('/ai/generate', { kind, payload }),
  aiInsights: (eventId) => fetcher.get(`/ai/insights/${eventId}`),

  // search
  search: (q) => fetcher.get('/search', { q }),
};
