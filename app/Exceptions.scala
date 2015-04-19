class AppException(msg: String) extends RuntimeException(msg)

class AppConfigurationException(msg: String) extends AppException("Configuration error: " + msg)