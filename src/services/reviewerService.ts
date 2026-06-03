// sementara hardcode dulu, nanti ganti dari auth store pas login udah jalan
const MOCK_REVIEWER_NAME = 'Akbar Purnama'

export function getCurrentReviewerName(): string {
  // TODO: return useAuthStore().currentUser?.name ?? 'Unknown'
  return MOCK_REVIEWER_NAME
}
