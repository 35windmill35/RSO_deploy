const getApiError = (code: number | undefined): string => {
  switch (code) {
    case -2:
      return "err.api._2";
    case -1:
      return "err.api._1";
    case 1:
      return "err.api.001"; //Not authenticated.
    case 2:
      return "err.api.002"; //"Request prohibited. Insufficient rights?";
    case 3:
      return "err.api.003"; //"Insufficient licenses";
    case 4:
      return "err.api.004"; //"Invalid login, password or API key";
    case 5:
      return "err.api.005"; //"Invalid or misconfigured session";
    case 6:
      return "err.api.006"; //"Invalid parameters, see error object";
    case 7:
      return "err.api.007"; //"General error";
    case 8:
      return "err.api.008"; //"Parent object is absent";
    case 9:
      return "err.api.009"; //"No parameters found";
    case 10:
      return "err.api.010"; //"Invalid or expired certificate";
    case 11:
      return "err.api.011"; //"API user and TS user are not matched";
    case 13:
      return "err.api.013"; //"Object is locked";
    case 14:
      return "err.api.014"; //"No file provided or No file exists";
    case 15:
      return "err.api.015"; //"Invalid e-mail or mail server error";
    case 16:
      return "err.api.016"; //"The request failed";
    case 17:
      return "err.api.017"; //"Server is misconfigured";
    case 18:
      return "err.api.018"; //"Invalid API version";
    case 19:
      return "err.api.019"; //"Invalid Response";
    case 20:
      return "err.api.020"; //"This user is disabled";
    case 21:
      return "err.api.021"; //"Database index must be specified";
    case 22:
      return "err.api.022"; //Invalid login or Application Code.
    case 23:
      return "err.api.023"; //User with credentials provided is not found.
    case 24:
      return "err.api.024"; //Your registration requests are too frequent. Wait a few minutes.
    case 25:
      return "err.api.025"; //"Server error. Try later";
    case 26:
      return "err.api.026"; //"Try count is over";
    case 27:
      return "err.api.027"; //Invalid confirmation code.
    case 28:
      return "err.api.028"; //"Formal and actual parameter quantities are not matched";
    case 29:
      return "err.api.029"; //"Invalid fields";
    case 30:
      return "err.api.030"; //SMS cannot be sent
    case 31:
      return "err.api.031"; //Debug feature is used in release mode!
    case 32:
      return "err.api.032"; //Not all parts of composite key are provided!
    case 33:
      return "err.api.033"; //Data too large
    case 34:
      return "err.api.034"; //The same request in progress
    case 35:
      return "err.api.035"; //Invalid CheckExistence object
    case 36:
      return "err.api.036"; //Path in CheckExistence object not found
    case 37:
      return "err.api.037"; //CheckExistence failed
    case 38:
      return "err.api.038"; //Some objects were missed
    case 39:
      return "err.api.039"; //Folder is unavailable or does not exists.
    case 40:
      return "err.api.040"; //The operation is in progress.
    case 41:
      return "err.api.041"; //No security key found.
    case 42:
      return "err.api.042"; //Invalid parameters.
    case 43:
      return "err.api.043"; //Object is unlocked.
    case 100:
      return "err.api.100"; //"User request-per-second rate exceeded";
    case 101:
      return "err.api.101"; //"User request-per-hour rate exceeded";
    case 102:
      return "err.api.102"; //"User request-per-day rate exceeded";
    case 103:
      return "err.api.103"; //"API_KEY request-per-second rate exceeded";
    case 104:
      return "err.api.104"; //"API_KEY request-per-second rate exceeded";
    case 105:
      return "err.api.105"; //"API_KEY request-per-day rate exceeded";
    default:
      return "error";
  }
};
export { getApiError };
