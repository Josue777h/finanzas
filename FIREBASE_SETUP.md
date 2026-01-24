# Configuración de Firebase

## Pasos para conectar tu app a Firebase:

### 1. Crear proyecto en Firebase
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Haz clic en "Agregar proyecto"
3. Dale un nombre a tu proyecto (ej: "finanzas-app")
4. Sigue los pasos de configuración

### 2. Configurar Authentication
1. En el panel izquierdo, ve a **Authentication**
2. Haz clic en "Comenzar"
3. En la pestaña "Método de inicio de sesión", activa **Email/Password**
4. Habilita "Email/Password" y guarda

### 3. Configurar Firestore Database
1. En el panel izquierdo, ve a **Firestore Database**
2. Haz clic en "Crear base de datos"
3. Elige "Iniciar en modo de prueba" (para desarrollo)
4. Selecciona una ubicación para la base de datos
5. Haz clic en "Habilitar"

### 4. Obtener credenciales
1. En la configuración del proyecto, ve a **Configuración del proyecto**
2. En la pestaña "General", haz clic en el ícono de web (</>)
3. Registra tu app con el nombre "finanzas-app"
4. Copia el objeto `firebaseConfig`

### 5. Actualizar configuración
Reemplaza las credenciales en `src/firebase/config.ts`:

```typescript
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};
```

### 6. Reglas de seguridad de Firestore
En Firestore Database → Reglas, reemplaza con:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Los usuarios solo pueden leer y escribir sus propios datos
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Los usuarios pueden leer y escribir sus propias transacciones
    match /transactions/{transactionId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
    
    // Los usuarios pueden leer y escribir sus propias cuentas
    match /accounts/{accountId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
  }
}
```

### 7. Probar la conexión
Una vez configurado, tu app debería:
- Registrar nuevos usuarios en Firebase Auth
- Guardar datos de usuarios en Firestore
- Mantener la sesión activa
- Funcionar con autenticación real

## Beneficios de Firebase:
✅ Autenticación segura y escalable
✅ Base de datos en tiempo real
✅ Sincronización automática
✅ Sin necesidad de backend propio
✅ Gratis para desarrollo y pequeño escala

## Notas importantes:
- Reemplaza las credenciales ANTES de subir a producción
- Las reglas de seguridad son cruciales para proteger los datos
- En producción, considera usar Firestore en modo producción (no prueba)
