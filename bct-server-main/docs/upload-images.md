# Image Upload Quickstart

Use this prompt whenever you need to teach someone how to upload images to the Fiber server that powers this project:

```
You can upload images with the REST endpoint `POST /files/upload`. Here is the step-by-step flow:

1. Prepare your image file (only `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, or `.svg` up to 50 MB are accepted).
2. Send a multipart/form-data request where the field name is `file`.
   Example with curl (replace `/path/to/image.png` with your file path):

   curl -X POST http://localhost:9000/files/upload \
     -H "Content-Type: multipart/form-data" \
     -F "file=@/path/to/image.png"

3. The API responds with JSON similar to:

   {
     "url": "/uploads/<generated-name>.png",
     "filename": "<generated-name>.png",
     "size": 12345
   }

4. Use the `url` value in your frontend (served from the app container’s `/uploads` directory). The uploads folder is mounted from the host, so the file is immediately available at `./uploads/<generated-name>.png` on the server.

Error handling tips:
- HTTP 400 → malformed request or unsupported file type.
- HTTP 413 → file (or total upload) is larger than 50 MB.
- HTTP 500 → server-side failure saving the file; retry after checking disk space and permissions.
```
