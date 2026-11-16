-- A still frame of an uploaded video (object storage key), shown on match cards. YouTube videos use YouTube's
-- own thumbnail, so this stays NULL for them. Written by the media worker after the upload.
ALTER TABLE videos ADD COLUMN thumbnail_path VARCHAR(500);
