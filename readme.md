Parqueadero inteligente

Lee la placa de un vehículo a partir de una foto (con un modelo CNN entrenado por nosotros) y registra su entrada o salida.

cliente -> backend (5000) -> modelo (5001) -> placa en JSON -> backend -> MongoDB -> JSON al cliente