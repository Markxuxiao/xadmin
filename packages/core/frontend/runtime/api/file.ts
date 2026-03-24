// File API
import client, { ApiResponse } from './client'

export interface FileRecord {
  id: string
  originalName: string
  storedName: string
  extension: string
  mimeType: string
  size: number
  path: string
  category: string
  uploaderId: string
  uploaderName: string
  refCount: number
  description: string | null
  url: string
  createdAt: string
  updatedAt: string
}

export interface UploadResponse {
  success: boolean
  data?: FileRecord
  message?: string
}

export async function uploadFile(
  file: File,
  category: string = 'attachment'
): Promise<UploadResponse> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('category', category)

  const res = await client.post<UploadResponse>('/file/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return res.data
}

export async function uploadFiles(
  files: File[],
  category: string = 'attachment'
): Promise<UploadResponse> {
  const formData = new FormData()
  files.forEach(file => formData.append('files', file))
  formData.append('category', category)

  const res = await client.post<UploadResponse>('/file/upload-multiple', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return res.data
}

export async function getFiles(params: {
  category?: string
  uploaderId?: string
  page?: number
  pageSize?: number
}): Promise<ApiResponse<{ data: FileRecord[]; total: number; page: number; pageSize: number }>> {
  const res = await client.get('/file', { params })
  return res.data
}

export async function getFile(id: string): Promise<ApiResponse<FileRecord>> {
  const res = await client.get<ApiResponse<FileRecord>>(`/file/${id}`)
  return res.data
}

export async function deleteFile(id: string): Promise<ApiResponse<void>> {
  const res = await client.delete<ApiResponse<void>>(`/file/${id}`)
  return res.data
}
