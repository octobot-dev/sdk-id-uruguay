# SDK ID Uruguay React Native

## Índice

- [Introducción](#introducción)
- [Consideraciones previas](#consideraciones-previas)
- [Instalación y configuración](#instalación-y-configuración)
  - [Instalación](#instalación)
  - [Instalación de react-native-ssl-pinning](#instalación-de-react-native-ssl-pinning)
  - [Configuración de redirect URI](#configuración-de-redirect-uri)
  - [Certificado *self-signed* en modo *testing*](#certificado-self-signed-en-modo-testing)
- [Utilización](#utilización)
- [Funcionalidades](#funcionalidades)
- [Errores](#errores)
  
## Introducción

En este documento se presentan las distintas funcionalidades brindadas por el componente SDK y una guía para lograr la integración del componente con la aplicación. Además, se exponen definiciones previas necesarias para entender el protocolo utilizado para la autenticación y autorización del usuario final.

Este SDK se basa en el protocolo [OAuth 2.0](https://oauth.net/2/) y [OpenID Connect](https://openid.net/connect/) para su implementación, brindando una capa de abstracción al desarrollador y simplificando la interacción con la [API REST de ID Uruguay](https://centroderecursos.agesic.gub.uy/web/seguridad/wiki/-/wiki/Main/ID+Uruguay+-+Integraci%C3%B3n+con+OpenID+Connect). Para que su integración con el SDK funcione, debe registrarse como RP (_Relaying Party_) en ID Uruguay, siguiendo las instrucciones disponibles en la [página web de AGESIC](https://www.gub.uy/agencia-gobierno-electronico-sociedad-informacion-conocimiento/comunicacion/publicaciones/desarrollo-seguro/desarrollo-seguro/usuario-gubuy-integracion-openid).

## Consideraciones previas

Para lograr autenticar y autorizar al usuario final, el componente SDK establece una comunicación con el servidor de *ID Uruguay* utilizando el protocolo *OpenID Connect 1.0*.
Este es un protocolo de identidad simple y de estándar abierto creado sobre el protocolo OAuth 2.0, el cual permite a aplicaciones cliente (*Relaying Party* - RP) verificar la identidad de un usuario final basado en la autenticación realizada por este en un Servidor de Autorización (*OpenID Provider* - OP), así como también obtener información personal del usuario final mediante el uso de una API REST.
Se tienen tres entidades principales:

- Servidor de Autorización (*OpenID Provider* - OP): capaz de autenticar usuarios finales y proveer información sobre estos y el proceso de autenticación a un RP.
- Aplicaciones Cliente (*Relaying Party* - RP): solicita la autenticación de un usuario final a un OP, con el fin de poder acceder a recursos protegidos en nombre del usuario final autenticado. El RP se integra con el componente SDK para tal fin.  
- Usuario final (*End User*): es el individuo que interactúa con la RP y se autentica haciendo uso de Usuario gub.uy.

El componente SDK funciona como intermediario de la comunicación entre el RP y el OP, en base a HTTP *requests* y *responses* que son presentadas a continuación:

- *Authentication Request*: pedido HTTP que incluye los *Authentication Request Params* y sirve para solicitar la autenticación de un *End User* en Usuario gub.uy. Puede llevarse a cabo empleando los métodos HTTP GET o HTTP POST. Este pedido es enviado al *Authorization Endpoint*. Los *Authentication Request Params* son:

    | Parámetro       | Tipo      | Descripción |
    |-----------------|-----------|-------------|
    | *scope*         | Requerido |Siempre debe incluirse "*openid*". Adicionalmente se pueden incluir los siguientes valores: *personal_info*, *profile*, *document*, *email*, *auth_info*.            |
    | *response_type* | Requerido | Valor que determina el tipo de flujo de autenticación a utilizar. En caso del [*Authorization Code Flow*](https://auth0.com/docs/flows/authorization-code-flow), es valor es "*code*".             |
    | *client_id*     | Requerido | Identificador del cliente provisto al momento del registro.             |
    | *redirect_uri*  | Requerido |URI a donde debe ser enviada la respuesta. La misma debe ser una de las registradas al momento de darse de alta como cliente.             |
    | *state*  | Recomendado |Valor opaco para mantener el estado entre el pedido y la respuesta. Será retornado al cliente junto con el código de autorización o error.             |
    | *nonce* | Opcional | String opaco utilizado para asociar la sesión de un Cliente con un *ID Token*, y mitigar *replay attacks*.    |
    | *prompt*  | Opcional |Lista de valores de cadena ASCII delimitados por un espacio, sensibles a minúsculas y mayúsculas, que especifica si el servidor de autorización solicita al usuario final la reautenticación y consentimiento. Los valores definidos son: *none*, *login* y *consent*.             |
    | *acr_values*  | Opcional |Lista de *strings* sensibles a minúsculas y mayúsculas, separados por espacios y en orden de preferencia, correspondientes a los nombrados en la sección acr - *Authentication Context Class Reference*.            |

- *Authentication Response*: respuesta HTTP (a una *Authentication Request*) que incluye los *Authentication Response Params*. Esta respuesta es obtenida desde el *Authorization Endpoint*. Los *Authentication Response Params* son:

    | Parámetro       | Tipo      | Descripción |
    |-----------------|-----------|-------------|
    | *code*         | Requerido |Código de autorización generado por el OP. Puede ser utilizado una única vez para obtener un *token*. Expira en 10 minutos. |
    | *state*     | Requerido si fue enviado | El valor exacto recibido del RP en el parámetro "*state*" del *Authentication Request*. |

- *Token Request*: pedido HTTP empleando el método POST que incluye los *Token Request Params* y sirve para solicitar un *token*. Este pedido es enviado al *Token Endpoint*. Los *Token Request Params* son:

    | Parámetro       | Tipo      | Descripción |
    |-----------------|-----------|-------------|
    | *grant_type*         | Requerido |Tipo de credenciales a presentar. Debe ser "*authorization_code*". |
    | *code* | Requerido | Código de autorización emitido por el OP, previamente tramitado en el *Authentication Endpoint*. |
    | *redirect_uri*     | Requerido | URI a donde debe ser redirigido el *User Agent* con la respuesta (*Token Response*). Debe ser una de las URIs configuradas al momento del registro del RP. |

    Además contiene el *client_id* y *client_secret* siguiendo el esquema de autenticación [*HTTP Basic Auth*](https://tools.ietf.org/html/rfc7617).

- *Token Response*: respuesta HTTP (a una *Token Request*) que incluye los *Token Response Params*. Esta respuesta es obtenida desde el *Token Endpoint*. Los *Token Response Params* son:

    | Parámetro       | Tipo      | Descripción |
    |-----------------|-----------|-------------|
    | *access_token*         | Requerido |*Access Token* emitido por el OP.|
    | *token_type* | Requerido | Tipo de *token*. Será siempre *Bearer*.             |
    | *id_token*     | Requerido | *ID Token* asociado a la sesión de autenticación.             |
    | *expires_in*  | Recomendado |Tiempo de vida del *Access Token* en segundos. Valor por defecto 60 minutos.             |
    | *refresh_token*  | Requerido |*Refresh Token* que puede ser utilizado para obtener nuevos *Access Tokens*             |

- *Refresh Token Request*: pedido HTTP empleando el método POST que incluye los *Refresh Token Request Params* y sirve para obtener un nuevo *token*, con la condición de haber obtenido un *token* previamente. Este pedido es enviado al *Token Endpoint*. Los *Refresh Token Request Params* son:

    | Parámetro       | Tipo      | Descripción |
    |-----------------|-----------|-------------|
    | *grant_type*         | Requerido |Tipo de credenciales a presentar. Debe ser "*refresh_token*". |
    | *refresh_token* | Requerido | *refresh_token* emitido por el OP, previamente tramitado en el *Token Request*. |

    Además contiene el *client_id* y *client_secret* siguiendo el esquema de autenticación [*HTTP Basic Auth*](https://tools.ietf.org/html/rfc7617).

- *Refresh Token Response*: respuesta HTTP (a una *Refresh Token Request*) que incluye los *Refresh Token Response Params*. Esta respuesta es obtenida desde el *Token Endpoint*. Los parámetros son los mismos que *Token Response Params*.

- *User Info Request*: pedido HTTP que incluye los *User Info Request Params* y sirve para solicitar información del End-User autenticado. Puede llevarse a cabo empleando los métodos HTTP GET o HTTP POST. Este pedido es enviado al *User Info Endpoint*. Los *User Info Request Params* son:

    | Parámetro       | Tipo      | Descripción |
    |-----------------|-----------|-------------|
    | *access_token*         | Requerido |Es incluido en el *header* HTTP *Authorization* siguiendo el esquema *Bearer* |

- *User Info Response*: respuesta HTTP (a una *User Info Request*) que incluye los *User Info Response Params*. Esta respuesta es obtenida desde el *User Info Endpoint*. Los *User Info Response Params* son un JSON conteniendo los *claims* solicitados. Dichos *claims* pueden ser:

    | Nombre      | Claims      | Descripción |
    |-----------------|-----------|-------------|
    | *personal_info*         | nombre_completo, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, uid, rid | Nombres y apellidos del usuario, identificador y el nivel de registro de identidad digital. Este último puede ser alguno de los siguientes valores: [0,1,2,3] correspondiendo a los niveles Muy Bajo, Bajo, Medio y Alto respectivamente. |
    | *profile*         | *name*, *given_name*, *family_name* | Nombre completo, nombre(s) y apellido(s) respectivamente. |
    | *document*         | pais_documento, tipo_documento, numero_documento | Información sobre el documento del usuario. |
    | *email*         | *email*, *email_verified* | Correo electrónico y si el mismo está verificado. |
    | *auth_info*         | rid, nid, ae | Datos de registro y autenticación del ciudadano en formato URN correspondientes a la Política de Identificación Digital. |

- *JWKS Request*: Pedido HTTP empleando el método GET que sirve para obtener la clave pública del OP útil para la validación de *tokens*. Este pedido es enviado al *JWKS Endpoint*.
- *JWKS Response*: Respuesta HTTP (a una *JWKS Request*) que incluye los *JWKS Response Params*. Esta respuesta es obtenida desde el *JWKS Endpoint*.

    | Parámetro       | Tipo      | Descripción |
    |-----------------|-----------|-------------|
    | *kty*         | Requerido |Identifica la familia del algoritmo criptográfico utilizado. |
    | *alg* | Requerido | Identifica el algoritmo utilizado. (`RS256`, `HS256`). |
    | *use*     | Requerido | Identifica el uso previsto de la clave pública. Indica si se usa para cifrar datos ("enc") o para verificar la firma ("sig"). |
    | *kid*     | Requerido | Identificador único. |
    | *n*     | Requerido | El módulo de la clave (2048 bit). Codificado en Base64. |
    | *e*     | Requerido | El exponente de la clave (2048 bit). Codificado en Base64. |

- *Logout Request*: pedido HTTP empleando el método GET que incluye los *Logout Request Params* y sirve para cerrar la sesión del *End User* autenticado en el OP. Este pedido es enviado al *Logout Endpoint*. Los *Logout Request Params* son:

    | Parámetro       | Tipo      | Descripción |
    |-----------------|-----------|-------------|
    | *id_token_hint*         | Requerido |Corresponde al *id_token* obtenido en el mecanismo de inicio de sesión del RP. El mismo identifica al ciudadano y cliente en cuestión y valida la integridad del RP por el hecho de la posesión del mismo, ya que fue intercambiado de forma segura. |
    | *state*     | Opcional | Valor opaco para mantener el estado entre el pedido y la respuesta. Será retornado como parámetro en la *post_logout_redirect_uri* enviada. |

- *Logout Response*: respuesta HTTP (a una *Logout Request*) que no incluye parámetros. Esta respuesta es obtenida desde el *Logout Endpoint*.

Cabe destacar que ante un posible error la *response* generada por el OP contiene los siguientes parámetros:

| Parámetro         | Tipo      | Descripción                                                                                                  |
|-------------------|-----------|--------------------------------------------------------------------------------------------------------------|
| *error*             | Requerido | Un código de error de los descritos en [OAuth 2.0](https://tools.ietf.org/html/rfc6749#section-5.1)                                                             |
| *error_description* | Opcional  | Descripción del error que provee información para ayudar a los desarrolladores a entender el error ocurrido. |
| *state* | Recomendado | El valor exacto recibido del RP en el parámetro *state* del *request* correspondiente.

## Instalación y configuración

### Instalación

El SDK se encuentra disponible en npm y puede instalarlo en su aplicación mediante el comando

`$ npm install sdk-gubuy-test`

Este comando añade el SDK y las dependencias necesarias al proyecto.

### Instalación de react-native-ssl-pinning

Para que el SDK funcione correctamente, debe instalar en su aplicación la librería [react-native-ssl-pinning](https://github.com/MaxToyberman/react-native-ssl-pinning). Esto se hace ejecutando el comando

`$ npm install react-native-ssl-pinning --save`

En caso de que su aplicación sea para dispositivos iOS, adicionalmente se debe ejecutar el siguiente comando

`$ cd ios && pod install`

### Configuración de redirect URI

Deberá configurar en su aplicación su *redirect URI*, como se explica en la [documentación de *React Native*](https://reactnative.dev/docs/linking#enabling-deep-links).

#### Android

En Android, esto implica editar el archivo `AndroidManifest.xml`, que se encuentra en el directorio
app/android/app/src/main/ de su aplicación *React Native*. En particular, se debe agregar un [*intent filter*](https://developer.android.com/training/app-links/deep-linking#adding-filters) en una de sus *activities*, como se muestra a continuación:

```xml
<!-- Esta es su MainActivity-->
<activity
  android:name=".MainActivity"
  android:label="@string/app_name"
  android:configChanges="keyboard|keyboardHidden|orientation|screenSize|uiMode"
  android:launchMode="singleTask"
  android:windowSoftInputMode="adjustResize">
  <intent-filter>
      <action android:name="android.intent.action.MAIN" />
      <category android:name="android.intent.category.LAUNCHER" />
  </intent-filter>
  <!--Debe agregar lo que sigue a continuación -->
  <intent-filter>
      <action android:name="android.intent.action.VIEW" />
      <category android:name="android.intent.category.DEFAULT" />
      <category android:name="android.intent.category.BROWSABLE" />
      <!--Aquí debe agregar su redirect URI-->
      <data android:scheme="su-redirect-uri" />
  </intent-filter>
  <!--Fin de lo que debe agregar -->
</activity>
```

#### iOS

En iOS, debe seguir los siguiente pasos (puede consultarlos con más detalle en [este link](https://medium.com/@MdNiks/custom-url-scheme-deep-link-fa3e701a6295) y en la [documentación de XCode](https://developer.apple.com/documentation/xcode/allowing_apps_and_websites_to_link_to_your_content/defining_a_custom_url_scheme_for_your_app)):

1. Abra su proyecto en XCode
2. Seleccione la opción "Target"
3. Seleccione "Info", y en la sección de URL Types haga click en el botón de "+".
4. En el campo "URL Schemes" ingrese su redirect URI

Tanto en el caso de Android como en el de iOS únicamente debe agregar la porción de su *redirect* URI que se encuentra previa a los símbolos "://".

### Certificado *self-signed* en modo *testing*

En modo de *testing*, es necesario agregar el certificado de la API de *testing* de ID Uruguay a los certificados confiables. Los certificados se pueden obtener ingresando a la URL <https://mi-testing.iduruguay.gub.uy/login> en Google Chrome, y haciendo *click* en el ícono de candado que se muestra a la izquierda de la URL. Allí, seleccionar "Certificado" (o "Certificate"), y en el cuadro de diálogo que se abre, seleccionar "Copiar en archivo" o "Exportar".

Para el desarrollo Android, debe copiar el certificado certificate.cer en la carpeta `android/app/src/main/assets` de su proyecto *React Native*.

Para el desarrollo en iOS, se deben obtener los tres certificados de la URL de *testing* de ID Uruguay, siguiendo el procedimiento explicado anteriormente. Luego, se debe abrir el proyecto en XCode y se deben seguir los siguientes pasos:

1. Arrastrar (*drag and drop*) los certificados descargados al proyecto en XCode.
2. Esto abrirá un cuadro de diálogo con varias opciones. Se debe marcar la opción "Copy items if needed", además de la opción "Create folder references". En la opción "Add to targets", marcar todas las opciones disponibles.
3. Luego de realizado esto, clickear el botón "Finish" del cuadro de diálogo

## Utilización

Para utilizar las funciones del SDK, se deben importar desde `sdk-gubuy-test`. Por ejemplo:

```javascript
import { initialize, login } from 'sdk-gubuy-test';
```

Antes de poder utilizar las funciones, se debe inicializar el SDK mediante la función `initialize`:

```javascript
try {
  initizalize(
    'miRedirectUri',
    'miClientId',
    'miClientSecret',
    miProduction,
    'miScope',
  );
} catch (error) {
  /*Manejar el error*/
}
```

Los valores para los parámetros son acordados con ID Uruguay al [registrarse](https://centroderecursos.agesic.gub.uy/web/seguridad/wiki/-/wiki/Main/ID+Uruguay+-+Integraci%C3%B3n+con+OpenID+Connect) exitosamente como RP, a excepción de *miScope* y *miProduction*.

Una vez inicializado el componente, se puede realizar el *login* con ID Uruguay mediante una llamada a la función `login`:

```javascript
await login();
```

Esta llamada podría realizarse cuando el usuario final presiona un botón, como se muestra en el siguiente ejemplo:

```javascript
const LoginButton = () => {
  const handleLogin = async () => {
    try {
      await login();
    } catch (error) {
      /*
        Manejar el error
      */
    }
  };

  return (
    <TouchableOpacity onPress={handleLogin}>
      <Text style={styles.buttonText}>Login con ID Uruguay</Text>
    </TouchableOpacity>
  );
};
```

 En la [App de ejemplo](/app/LoginButton/index.js) se puede ver un ejemplo de uso más detallado.

## Funcionalidades

| Función                                                      | Descripción                                                                                                                                                                            |
|--------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `getParameters()` | Obtiene los parámetros que se encuentran *seteados* en el SDK                                                                       |
| `setParameters(parameters)` | *Setea* los parámetros pasados por parámetro en el SDK. Además los valida antes de su asignación contra valores maliciosos.                                                                  |
| `clearParameters()` | Borra todos los parámetros a excepción de: *redirectUri*, *clientId*, *clientSecret* y *production*.                                                                   |
| `resetParameters()` | Borra todos los parámetros a excepción de *production*, para el cual *setea* su valor en *false*.
| `initialize (redirectUri, clientId, clientSecret, production, scope)` | Inicializa el SDK con los parámetros *redirectUri*, *clientId*, *clientSecret*, *production* y *scope*, que son utilizados en la interacción con la API de ID Uruguay.                                                                                       |
| `login()`                                                    | Abre una ventana del navegador web del dispositivo para que el usuario final digite sus credenciales e inicie sesión con ID Uruguay. Una vez iniciada la sesión, se realiza una redirección al *redirectUri* configurado y se devuelve el *code* y un *state*.  En caso de error, devuelve el mensaje correspondiente.|
| `getToken()`                                                  | Devuelve el *token* correspondiente para el usuario final autenticado.                                                                                                   |
| `refreshToken()`                                              | Actualiza el *token* del usuario final autenticado. Debe haberse llamado a `getToken()` previamente.                                                                                                    |
| `getUserInfo()`                                               | Devuelve la información provista por ID Uruguay sobre el usuario final autenticado.  Debe haberse llamado a `getToken` previamente.                                                                                                       |
| `validateToken()`                                                    | Verifica que el *token* recibido durante `getToken()` o `refreshToken()` sea válido, tomando en cuenta la firma, los campos alg, iss, aud, kid y que no esté expirado.                                                                                                                                          |
| `logout()`                                                    | Cierra la sesión del usuario final en ID Uruguay y retorna el *state* obtenido. Es necesario volver a *setear* el *scope* una vez cerrada la sesión si se desea realizar un login sin antes haber invocado a la función de inicialización.                                                                                                                                         |

### Función getParameters

Esta función retorna los parámetros del SDK en un objeto con pares *(clave, valor)*, por ejemplo:

```javascript
{
  redirectUri: 'miRedirectUri',
  clientId: 'miClientId',
  clientSecret: 'miClientSecret',
  code: 'miCode',
  accessToken: 'miAccessToken',
  refreshToken: 'miRefreshToken',
  tokenType: 'miTokenType',
  expiresIn: 'miExpiresIn',
  idToken: 'miIdToken',
  scope: 'miScope',
  production: false,
}
```

Por ende, para obtener el valor del parámetro *redirectUri*, por ejemplo, basta con el siguiente código:

```javascript
const parameters = getParameters();
const valorRedirectUri = parameters.redirectUri;
```

### Función setParameters

Esta función *setea* los parámetros en el SDK. Observar que algunos de los parámetros pueden ser *seteados* también utilizando la función *initialize*. Para poder *setear* los parámetros, alcanza con pasar a la función un objeto con pares *(clave, valor)*, donde las claves sean los nombres de los parámetros a *setear*, y el valor sus correspondientes valores. A su vez, la función debe ser llamada dentro de un bloque *try*, ya que en caso de que no sea válido algún parámetro, la función lanzará una excepción. Por ejemplo, el siguiente código *seteará* los parámetros *redirectUri* y *clientId*:

```javascript
try {
  const response = setParameters({
    redirectUri: 'miRedirectUri',
    clientId: 'miClientId',
  });
} catch (error){
  /* Manejar el error */
}
```

Destacar que esta función no permite *setear* parámetros vacíos.

#### Errores setParameters

Los errores que puede devolver esta función son: `ERRORS.NO_ERROR`, `ERRORS.INVALID_PRODUCTION`, `ERRORS.INVALID_EXPIRES_IN`, `ERRORS.INVALID_SCOPE`, `ERRORS.INVALID_REDIRECT_URI`, `ERRORS.INVALID_TOKEN_TYPE`, `ERRORS.INVALID_CLIENT_ID`, `ERRORS.INVALID_CLIENT_SECRET`, `ERRORS.INVALID_AUTHORIZATION_CODE`, `ERRORS.INVALID_TOKEN` y `ERRORS.INVALID_ID_TOKEN`.

### Función clearParameters

Esta función limpia todos los parámetros del módulo de configuración, a excepción de *redirectUri*, *clientId*, *clientSecret* y *production*. Basta con llamarla de la siguiente manera:

```javascript
clearParameters();
```

### Función resetParameters

Esta función limpia todos los parámetros del módulo de configuración, a excepción de *production*, que lo *setea* en *false*. Basta con llamarla de la siguiente manera:

```javascript
resetParameters();
```

### Función initialize

Se debe inicializar el SDK con la función `initialize`, que recibe como parámetros: *redirectUri*, *clientId*, *clientSecret*, *production* y *scope*. El último parámetro es opcional y se corresponde con el parámetro *scope* que requiere la *Authentication Request*. El parámetro *production* es un booleano que deberá inicializarse en *true* en el caso de que se quiera acceder a los *endpoints* de producción de ID Uruguay, y en *false* si se quiere acceder a los *endpoints* de *testing*. La función *initialize* debe ser llamada dentro de un bloque *try*, ya que en caso de no poder *setear* los parámetros, la misma lanzará una excepción.

```javascript
try {
  const response = initialize(
    'miRedirectUri',
    'miClientId',
    'miClientSecret',
    'miProduction',
    'miScope',
  );
} catch (error) {
  /* Manejar el error */
}
```

Luego de esto, se considera que el SDK se encuentra inicializado correctamente.

#### Errores initialize

Los errores que puede devolver son: `ERRORS.NO_ERROR`, `ERRORS.INVALID_REDIRECT_URI`, `ERRORS.INVALID_CLIENT_ID`, `ERRORS.INVALID_CLIENT_SECRET`, `ERRORS.INVALID_PRODUCTION` y `ERRORS.FAILED_REQUEST`.

### Función login

La función `login` abre una ventana en el navegador web del dispositivo con la URL del inicio de sesión con ID Uruguay (<https://mi.iduruguay.gub.uy/login> o <https://mi-testing.iduruguay.gub.uy/login> si se está en modo *testing*). Una vez que el usuario final ingresa sus credenciales y autoriza a la aplicación, este es redirigido a la *redirectUri* configurada en la inicialización del SDK. Esta función devuelve el *code* correspondiente al usuario final autenticado, el *state* obtenido en la respuesta del OP y un mensaje de éxito. En caso de error se produce una excepción.

``` javascript
try {
  const loginResponse = await login();
  code = loginResponse.code;
  /* Hacer algo con el code */
} catch (error) {
  /* Manejar el error */
}
```

El *code* retornado por la función se guarda internamente en el SDK durante la sesión del usuario final (no se guarda en el dispositivo, solo en memoria). De no necesitar los parámetros retornados, se puede llamar al `login` sin guardar la respuesta:

``` javascript
try {
  await login();
} catch (error) {
  /* Manejar el error */
}
```

Se debe notar que si el usuario final no inicia la sesión con ID Uruguay (ya sea porque cierra el navegador, o porque ingresa credenciales incorrectas), no se redirigirá a la *redirectUri* especificada. Esto también sucede cuando el RP ingresa credenciales no válidas en el SDK (a través de *initialize* o *setParameters*).

#### Errores login

Los errores que puede devolver son: `ERRORS.NO_ERROR`, `ERRORS.INVALID_CLIENT_ID`, `ERRORS.INVALID_REDIRECT_URI`, `ERRORS.INVALID_CLIENT_SECRET`, `ERRORS.ACCESS_DENIED`, `ERRORS.INVALID_STATE`, `ERRORS.INVALID_AUTHORIZATION_CODE` y `ERRORS.FAILED_REQUEST`.

### Función getToken

Una vez realizado el `login`, es posible obtener el *token* correspondiente al usuario final autenticado. Para esto se debe invocar a la función `getToken`:

``` javascript
try {
  const token = await getToken();
  /* Hacer algo con el token */
} catch (error) {
  /* Manejar el error */
}
```

Al igual que el *code*, el *token* retornado se guarda en el SDK, con lo que de no necesitar almacenar el *token*, también se puede llamar a `getToken` sin guardar la respuesta.

#### Errores getToken

Los errores que puede devolver son: `ERRORS.NO_ERROR`, `ERRORS.INVALID_REDIRECT_URI`, `ERRORS.INVALID_CLIENT_ID`, `ERRORS.INVALID_CLIENT_SECRET`, `ERRORS.INVALID_AUTHORIZATION_CODE`, `ERRORS.INVALID_TOKEN`, `ERRORS.INVALID_ID_TOKEN`, `ERRORS.INVALID_TOKEN_TYPE`,  `ERRORS.INVALID_GRANT`, `ERRORS.INVALID_CLIENT` y `ERRORS.FAILED_REQUEST`.

### Función refreshToken

El *token* otorgado por ID Uruguay tiene un tiempo de expiración fijo, por lo que una vez transcurrido este tiempo, el *token* pasará a ser inválido. Para obtener un nuevo *token* se debe invocar a la función `refreshToken`.

``` javascript
try {
  const token = await refreshToken();
  /* Hacer algo con el token */
} catch (error) {
  /* Manejar el error */
}
```

Esta función requiere que la función `getToken` haya sido ejecutada de forma correcta. Destacar que el SDK no refresca los *tokens* automáticamente por lo que es tarea del RP refrescarlos con esta función.

#### Errores refreshToken

Los errores que puede devolver son: `ERRORS.NO_ERROR`, `ERRORS.INVALID_REDIRECT_URI`, `ERRORS.INVALID_CLIENT_ID`, `ERRORS.INVALID_CLIENT_SECRET`, `ERRORS.INVALID_GRANT`, `ERRORS.INVALID_TOKEN`, `ERRORS.INVALID_ID_TOKEN`, `ERRORS.INVALID_TOKEN_TYPE`, `ERRORS.INVALID_CLIENT` y `ERRORS.FAILED_REQUEST`.

### Función getUserInfo

Luego de realizado el `getToken`, se puede invocar la función `getUserInfo` para obtener la información del usuario final autenticado, provista por ID Uruguay:

``` javascript
try {
  const userInfo = await getUserInfo();
  /* Hacer algo con la userInfo */
} catch (error) {
  /* Manejar el error */
}
```

Esta función devuelve un objeto con el siguiente formato:

```javascript
{
  sub: '5968',
  name: 'Clark Jose Kent Gonzalez',
  given_name: 'Clark Jose',
  family_name: 'Kent Gonzalez',
  nickname: 'uy-ci-12345678',
  email: 'kentprueba@gmail.com',
  email_verified: true,
  nombre_completo: 'Clark Jose Kent Gonzalez',
  primer_nombre: 'Clark',
  segundo_nombre: 'Jose',
  primer_apellido: 'Kent',
  segundo_apellido: 'Gonzalez',
  uid: 'uy-ci-12345678',
  pais_documento: { codigo: 'uy', nombre: 'Uruguay' },
  tipo_documento: { codigo: 68909, nombre: 'C.I.' },
  numero_documento: '12345678',
  ae: 'urn:uce:ae:1',
  nid: "urn:uce:nid:1",
  rid: "urn:uce:rid:1",
}
```

El contenido de la respuesta variará dependiendo del *scope* utilizado. La respuesta de ejemplo presentada es el resultado de utilizar todos los *scopes* posibles.

#### Errores getUserInfo

Los errores que puede devolver son: `ERRORS.NO_ERROR`, `ERRORS.INVALID_TOKEN`, `ERRORS.INVALID_ID_TOKEN`, `ERRORS.INVALID_SUB` y `ERRORS.FAILED_REQUEST`.

### Función validateToken

La función `validateToken` permite al usuario validar el *token* obtenido con una llamada a `getToken` o `refreshToken`.

Al llamar a la función se valida el *token*. Para esto se obtiene del *JWKS Endpoint* las claves y algoritmos que el OP utiliza. Posteriormente, con estos datos se procede a verificar que el *idToken* sea un [JWT (JsonWebToken)](https://tools.ietf.org/html/rfc7519). Si esto se cumple se valida la firma del *token*, además de los siguientes campos:

| Parámetro | Valor                                 |
|-----------|---------------------------------------|
| alg       | Algoritmo de la firma.                |
| iss       | Quien creó y firmó el *token*.          |
| aud       | Para quién está destinado el *token*.   |
| exp       | Tiempo de expiración.                 |
| kid       | Identificador único.                  |
| acr       | *Authentication Context Class Reference*|
| amr       | *Authentication Methods References*     |

Para llamar a la función se debe utilizar:

```javascript
try {
  const respValidateToken = await validateToken();
  /* Procesar respuesta */
} catch (error) {
  /* Manejar el error */
}
```

#### Errores validateToken

Los errores que puede devolver son: `ERRORS.NO_ERROR`, `ERRORS.INVALID_CLIENT_ID`, `ERRORS.INVALID_ID_TOKEN` y `ERRORS.FAILED_REQUEST`.

#### Aclaraciones validateToken

El reloj del generador JWT o del verificador puede ser más rápido o más lento, lo que puede provocar que, si estos son muy diferentes, falle la validación. Para solucionar esto se agrega a la validación un período de gracia, de 60 segundos, que indica la diferencia aceptable entre los relojes de ambos sistemas.

### Función logout

La función `logout` permite al usuario final cerrar su sesión con el OP de ID Uruguay. Observar que la sesión que se había iniciado en el navegador web a través del `login` seguirá activa por lo que es tarea del usuario final cerrar dicha sesión.

``` javascript
try {
  await logout();
} catch (error) {
  /* Manejar el error */
}
```

#### Errores logout

Los errores que puede devolver son: `ERRORS.NO_ERROR`, `ERRORS.INVALID_ID_TOKEN_HINT`, `ERRORS.INVALID_URL_LOGOUT`, `ERRORS.INVALID_STATE` y `ERRORS.FAILED_REQUEST`.

## Errores

De forma de establecer un modelo de errores consistente dentro del SDK, se define que cada error devuelto debe tener una estructura específica, definida en el archivo `errors.js`.

Cada error es una extensión de la clase `Error` de `javascript`, y tiene la siguiente estructura:

```javascript
class NewError extends Error {
  constructor(
    errorCode = 'newErrorCode',
    errorDescription = 'newErrorDescription',
    ...params
  ) {
    // Pasa los argumentos restantes (incluidos los específicos del proveedor) al constructor padre.
    super(...params);
    // Información de depuración personalizada.
    this.name = 'NewError';
    this.errorCode = errorCode;
    this.errorDescription = errorDescription;
  }
}
```

Se agregan los campos:

| Campo            | Descripción                        |
|------------------ |----------------------------------- |
| errorCode         | Código identificador del error.  |
| errorDescription  | Descripción del error.             |

Los errores definidos son:

| Clase                            | Código                                    | Descripción                                                                                                                                                                             | ¿Cuándo ocurre?                                                                                                         | Posible solución                                                                            |
|--------------------------------- |------------------------------------------ |---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |------------------------------------------------------------------------------------------------------------------------ |-------------------------------------------------------------------------------------------- |
| `ErrorNoError`                   | gubuy_no_error                            | No error                                                                                                                                                                                | Cuando la función cumple correctamente su objetivo.                                                                     | No aplica.                                                                                  |
| `ErrorInvalidClientId`           | gubuy_invalid_client_id                   | Invalid client_id parameter.                                                                                                                                                            | Cuando el valor del clientId definido para el SDK no es correcto.                                                      | Comprobar que el clientId definido corresponda con el designado por ID Uruguay.               |
| `ErrorInvalidRedirectUri`        | gubuy_invalid_redirect_uri                | Invalid redirect_uri parameter.                                                                                                                                                         | Cuando la redirectUri definida para el SDK no es válida.                                                               | Comprobar que la redirectUri definida corresponda con la designada por ID Uruguay.            |
| `ErrorInvalidClientSecret`       | gubuy_invalid_client_secret               | Invalid client_secret parameter.                                                                                                                                                        | Cuando el clientSecret definido para el SDK no es válido.                                                              | Comprobar que el clientSecret definido corresponda con el designado por ID Uruguay.           |
| `ErrorInvalidProduction`       | invalid_production               | Invalid production parameter.                                                                                                                                                        | Cuando el parámetro production no es booleano.                                                              | Comprobar que el parámetro production es del tipo booleano.           |
| `ErrorInvalidExpiresIn`       | invalid_expires_in               | Invalid expires_in parameter.                                                                                                                                                        | Cuando el parámetro expiresIn no es un entero positivo.                                                              | Comprobar que el parámetro expiresIn es un entero positivo.           |
| `ErrorInvalidScope`       | invalid_scope               | Invalid scope parameter.                                                                                                                                                        | Cuando el parámetro scope es inválido.                                                              | Comprobar la validez del scope.           |
| `ErrorAccessDenied`              | access_denied                             | The resource owner or authorization server denied the request.                                                                                                                          | Cuando el usuario final rechaza el login.                                                                               | No aplica.                                                                                  |
| `ErrorInvalidAuthorizationCode`  | gubuy_invalid_auhtorization_code          | Invalid authorization code.                                                                                                                                                             | Cuando el code definido en el SDK no es válido.                                                                         | Comprobar que el code actual corresponde al devuelto por la función Login().                  |
| `ErrorFailedRequest`             | failed_request                            | Couldn't make request.                                                                                                                                                                  | Cuando la request no pudo ser completada satisfactoriamente.                                                            | Comprobar que los parámetros de la request sean válidos y comprobar la conexión a internet.   |
| `ErrorInvalidGrant`              | invalid_grant                             | The provided authorization grant or refresh token is invalid, expired, revoked, does not match the redirection URI used in the authorization request, or was issued to another client.  | Cuando el code o refreshToken son inválidos o expiraron, y no se puede obtener un nuevo token de forma satisfactoria.  | Comprobar la validez del code o refreshToken según corresponda.                            |
| `ErrorInvalidToken`              | invalid_token                             | The access_token provided is expired, revoked, malformed, or invalid for other reasons.                                                                                                 | Cuando el accessToken es inválido o expiró, y no se puede obtener la UserInfo de forma satisfactoria.                  | Comprobar la validez del accessToken.                                                      |
| `ErrorInvalidClient`             | invalid_client                            | Client authentication failed (e.g., unknown client, no client authentication included, or unsupported authentication method)                                                            | Cuando no se pudo obtener un nuevo token de forma correcta.                                                             | Comprobar que el clientSecret y clientId correspondan con los registrados por ID Uruguay.  |
| `ErrorInvalidIdTokenHint`        | invalid_id_token_hint                     | Invalid id_token_hint parameter.                                                                                                                                                        | Cuando el parámetro idTokenHint es inválido o no existe a la hora de llamar a Logout.                                 | Comprobar la existencia y validez del idTokenHint.                                        |                                                   |
| `ErrorInvalidIdToken`            | invalid_id_token                          | Invalid id_token.                                                                                                                                                                       | Cuando el idToken registrado en el SDK es inválido.                                                                     | Comprobar que el idToken sea el mismo recibido durante getToken o refreshToken.             |
| `ErrorInvalidTokenType`            | invalid_token_type                          | Invalid token_type parameter.                                                                                                                                                                       | Cuando el parámetro tokenType registrado en el SDK es inválido.                                                                     | Comprobar la validez del tokenType.             |
| `ErrorInvalidUrlLogout`            | invalid_url_logout                          | Invalid returned url for logout.                                                                                                                                                                       | Cuando la URL contenida en la respuesta del OP no coincide con el logoutEndpoint.                                                                     | No aplica.              |
| `ErrorInvalidSub`            | gubuy_invalid_sub                          | Sub returned by API does not match given sub.                                                                                                                                                                       | Cuando el sub correspondiente al token utilizado no coincide con el sub de la respuesta del OP.                                                                     | Comprobar que el sub correspondiente con el token coincide con el sub de la respuesta del OP.             |
| `ErrorInvalidState`     | invalid_state          | Invalid state parameter.                                                                                                                                                     | Cuando el *state* obtenido en una *response* no coincide con el *state* enviado en la *request* correspondiente.                                                   | No aplica.               |
| `ErrorBase64InvalidLength`       | base64URL_to_base64_invalid_length_error  | Input base64url string is the wrong length to determine padding.                                                                                                                        | Cuando el n (modulous) del idToken es inválido.                                                                         | Comprobar que el idToken sea el mismo recibido durante getToken o refreshToken.               |
| `ErrorBase64ToHexConversion`     | invalid_base64_to_hex_conversion          | Error while decoding base64 to hex.                                                                                                                                                     | Cuando el n (modulous) o el e (exponente) del idToken son inválidos.                                                    | Comprobar que el idToken sea el mismo recibido durante getToken o refreshToken.               |
