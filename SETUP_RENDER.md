# Configuración de Variables de Entorno en Render

Para que la subida de música funcione, debes configurar las siguientes variables de entorno en tu servicio de Render:

## Pasos:

1. Ve a https://dashboard.render.com
2. Selecciona tu servicio "spotify-backend" (o el nombre que uses)
3. Haz clic en "Environment"
4. Agrega estas variables (copia, no las exponga públicamente):

```
MONGO_URI=mongodb+srv://admin_rtn:Gustavo@cluster0.jankj83.mongodb.net/?appName=Cluster0
JWT_SECRET=LA_CREW_2026
CLOUDINARY_NAME=dn7dxcbve
CLOUDINARY_KEY=mediaflows_61ea1128-3604-4939-b34f-f8cf546ddada
CLOUDINARY_SECRET=ScfLkxSWaup2Y8P9T7BycVwlFUg
PORT=10000
```

5. Haz clic en "Save"
6. Ve a "Settings" → "Redeploy" → "Manual Redeploy" y haz clic en "Latest Commit"

## Endpoints disponibles:

- `POST /register` - Registrar usuario
- `POST /login` - Iniciar sesión
- `GET /search?query=...` - Buscar artistas
- `POST /upload-song` - Subir canción (multipart/form-data)

## Variables de entorno necesarias:

| Variable | Descripción |
|----------|-------------|
| MONGO_URI | URL de conexión a MongoDB Atlas |
| JWT_SECRET | Secreto para tokens JWT |
| CLOUDINARY_NAME | Nombre de tu cuenta Cloudinary |
| CLOUDINARY_KEY | API Key de Cloudinary |
| CLOUDINARY_SECRET | API Secret de Cloudinary |
| PORT | Puerto donde corre el servidor (default 10000) |

## Probar localmente:

```bash
cd backend
# Llena el .env con tus valores
npm install
npm start
```

Luego en frontend, configura REACT_APP_API_URL=http://localhost:10000 en .env.development
