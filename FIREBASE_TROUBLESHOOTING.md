# Solución de Problemas con Firebase

## 🚨 Problema: "No aparece el usuario en Firestore"

### ✅ Pasos para solucionar:

#### 1. Verificar que Firestore esté habilitado
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto: `listadetareas-cb9a7`
3. En el menú izquierdo, ve a **Firestore Database**
4. Si no está creada, haz clic en **"Crear base de datos"**
5. Elige **"Iniciar en modo de prueba"** (por ahora)
6. Selecciona una ubicación y haz clic en **"Habilitar"**

#### 2. Verificar reglas de seguridad
En Firestore Database → Reglas, asegúrate de tener:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir lectura/escritura durante desarrollo
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2025, 1, 1);
    }
  }
}
```

#### 3. Verificar Authentication
1. Ve a **Authentication** en el menú izquierdo
2. En la pestaña **"Método de inicio de sesión"**
3. Asegúrate que **"Email/Password"** esté habilitado
4. Revisa que no haya restricciones

#### 4. Probar con la consola del navegador
1. Abre tu aplicación
2. Abre la consola del navegador (F12)
3. Intenta registrar un nuevo usuario
4. Busca estos mensajes:
   - ✅ "Iniciando registro de usuario: email@ejemplo.com"
   - ✅ "Usuario creado en Auth: uid-12345"
   - ✅ "Intentando guardar en Firestore: {...}"
   - ✅ "Datos guardados exitosamente en Firestore"

#### 5. Verificar manualmente en Firebase Console
1. Ve a **Firestore Database**
2. Deberías ver una colección llamada **"users"**
3. Dentro debería haber documentos con los UID de los usuarios

### 🔍 Si hay errores comunes:

#### Error: "Missing or insufficient permissions"
**Solución:** Las reglas de seguridad son muy restrictivas. Usa las reglas de prueba arriba.

#### Error: "7 PERMISSION_DENIED"
**Solución:** Firestore no está habilitado o las reglas no permiten escritura.

#### Error: "FirebaseError: No document to update"
**Solución:** El usuario se creó en Auth pero no en Firestore. Revisa la consola.

### 🛠️ Solución rápida (temporal):

Si nada funciona, usa estas reglas de seguridad:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // ⚠️ Solo para desarrollo!
    }
  }
}
```

### 📱 Para probar:

1. **Abre la consola del navegador**
2. **Intenta registrar un usuario nuevo**
3. **Revisa los mensajes de depuración**
4. **Verifica en Firebase Console** → Firestore Database

### 🔄 Si el usuario aparece en Authentication pero no en Firestore:

El problema está en las reglas de Firestore. Revisa el paso 2.

### 📞 Si sigues con problemas:

1. **Copia y pega** los errores de la consola del navegador
2. **Verifica que el proyecto correcto** esté seleccionado en Firebase Console
3. **Asegúrate de haber guardado** los cambios en las reglas de Firestore
