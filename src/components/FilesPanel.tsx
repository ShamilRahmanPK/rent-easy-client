import { useMutation } from "@tanstack/react-query";
import { api } from "../api/client";
import { formatBytes } from "../lib/format";
import type { FileItem } from "../lib/types";
import { useToast } from "./Toast";
import { FileDrop } from "./ui";

// Photo grid with upload, cover choice and delete. Works for both properties and units.
export function PhotosPanel({ photos, uploadPath, max, onChanged, canEdit = true }: { photos: FileItem[]; uploadPath: string; max: number; onChanged: () => void; canEdit?: boolean }) {
  const toast = useToast();

  const upload = useMutation({
    mutationFn: (files: File[]) => {
      const body = new FormData();
      files.forEach((file) => body.append("photos", file));
      return api.post(uploadPath, body);
    },
    onSuccess: () => {
      toast.success("Photos uploaded");
      onChanged();
    },
    onError: toast.error,
  });
  const cover = useMutation({ mutationFn: (id: string) => api.patch(`/files/${id}/cover`), onSuccess: onChanged, onError: toast.error });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/files/${id}`),
    onSuccess: () => {
      toast.success("Photo removed");
      onChanged();
    },
    onError: toast.error,
  });

  return (
    <div className="stack">
      {photos.length > 0 && (
        <div className="thumbs">
          {photos.map((photo, index) => (
            <div key={photo.id} className="thumb">
              {photo.isCover && <span className="tag tag--brand">Cover</span>}
              <img src={photo.thumbUrl ?? photo.url ?? ""} alt={`Photo ${index + 1}`} loading="lazy" />
              {canEdit && (
                <div className="thumb__bar">
                  {photo.isCover ? <span className="muted">Main photo</span> : <button type="button" className="link" onClick={() => cover.mutate(photo.id)}>Make cover</button>}
                  <button type="button" className="link link--danger" onClick={() => remove.mutate(photo.id)}>Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {canEdit && photos.length < max && (
        <FileDrop accept="image/jpeg,image/png,image/webp" multiple busy={upload.isPending} label={`Add photos (JPG, PNG or WebP, up to 5 MB each). ${photos.length} of ${max} used.`} onFiles={(files) => upload.mutate(files)} />
      )}
    </div>
  );
}

export function DocumentsPanel({ documents, uploadPath, onChanged, canEdit = true }: { documents: FileItem[]; uploadPath: string; onChanged: () => void; canEdit?: boolean }) {
  const toast = useToast();
  const upload = useMutation({
    mutationFn: (files: File[]) => {
      const body = new FormData();
      files.forEach((file) => body.append("documents", file));
      return api.post(uploadPath, body);
    },
    onSuccess: () => {
      toast.success("Documents uploaded");
      onChanged();
    },
    onError: toast.error,
  });
  const remove = useMutation({ mutationFn: (id: string) => api.delete(`/files/${id}`), onSuccess: onChanged, onError: toast.error });

  return (
    <div className="stack">
      {documents.length > 0 && (
        <ul className="docs">
          {documents.map((file) => (
            <li key={file.id}>
              <span>{file.originalName} <span className="muted small">· {formatBytes(file.sizeBytes)}</span></span>
              <span className="row">
                <a className="link small" href={file.downloadUrl ?? "#"}>Download</a>
                {canEdit && <button type="button" className="link link--danger small" onClick={() => remove.mutate(file.id)}>Delete</button>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {canEdit && documents.length < 5 && (
        <FileDrop accept="application/pdf,image/jpeg,image/png" multiple busy={upload.isPending} label="Add ownership documents, such as the title deed (PDF, JPG or PNG, up to 10 MB)" onFiles={(files) => upload.mutate(files)} />
      )}
    </div>
  );
}
