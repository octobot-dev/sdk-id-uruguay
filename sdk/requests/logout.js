import { fetch } from 'react-native-ssl-pinning';
import { Platform } from 'react-native';
import { logoutEndpoint } from '../utils/endpoints';
import { ERRORS } from '../utils/constants';
import { getParameters, clearParameters } from '../configuration';

const logout = async () => {
  var now = require("performance-now")
  var start = now();
  const parameters = getParameters();
  try {
    // Si alguno de los parámetros obligatorios para la request
    // no se encuentra inicializado, se rechaza la promesa y se
    // retorna un error que especifica cuál parámetro
    // faltó.
    if (!parameters.idToken)
      return Promise.reject(ERRORS.INVALID_ID_TOKEN_HINT);
    if (!parameters.postLogoutRedirectUri)
      return Promise.reject(ERRORS.INVALID_POST_LOGOUT_REDIRECT_URI);

    // Se arma la solicitud a enviar al logoutEndpoint.
    var end = now();
    const response = await fetch(logoutEndpoint(), {
      method: 'GET',
      pkPinning: Platform.OS === 'ios',
      sslPinning: {
        certs: ['certificate'],
      },
    });
    var start2 = now();
    const { status } = response;
    const urlCheck = response.url;

    // Si los parámetros obligatorios para la request se encuentran
    // inicializados, se procede a evaluar la respuesta del OP.
    if (status === 200) {
      if (urlCheck === logoutEndpoint()) {
        const state = urlCheck.match(/&state=([^&]+)/);
        clearParameters();
        if (state){
          var end2 = now();
          return Promise.resolve({
            message: ERRORS.NO_ERROR,
            errorCode: ERRORS.NO_ERROR.errorCode,
            errorDescription: ERRORS.NO_ERROR.errorDescription,
            state: state[1],
            tiempo: (end2-start2) + (end-start),
          });
        }
        var end3=now();
        return Promise.resolve({
          message: ERRORS.NO_ERROR,
          errorCode: ERRORS.NO_ERROR.errorCode,
          errorDescription: ERRORS.NO_ERROR.errorDescription,
          tiempo: (end3-start2) + (end-start),
        });
      }
      // Si la url contenida en la respuesta no coincide con el
      // logoutEnpoint, se rechaza la promesa retornando un error.
      return Promise.reject(ERRORS.INVALID_URL_LOGOUT);
    }
    // En cualquier otro caso, se rechaza la promesa
    return Promise.reject(ERRORS.FAILED_REQUEST);
  } catch (error) {
    // En caso de que el estado de la respuesta no sea 200,
    // se rechaza la promesa retornando un error.
    return Promise.reject(ERRORS.FAILED_REQUEST);
  }
};

export default logout;