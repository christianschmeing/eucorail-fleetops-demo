// Approximate railway polylines for demo path-following (lon, lat)
export const railPolylineByLine: Record<string, [number, number][]> = {
  RE9: [
    [9.9829, 48.3994], // Ulm Hbf
    [10.103, 48.43],
    [10.2, 48.45],
    [10.2777, 48.4556], // Günzburg
    [10.42, 48.44],
    [10.65, 48.42],
    [10.78, 48.39],
    [10.8855, 48.3651], // Augsburg Hbf
  ],
  MEX16: [
    [9.1816, 48.7836], // Stuttgart Hbf
    [9.3, 48.76],
    [9.5, 48.73],
    [9.652, 48.7055], // Göppingen
    [9.8, 48.64],
    [9.9, 48.52],
    [9.9829, 48.3994], // Ulm Hbf
  ],
  RE8: [
    [9.1829, 48.7834], // Stuttgart
    [9.427, 48.95],
    [9.737, 49.111],
    [9.953, 49.794], // Würzburg (approx)
  ],
  RE7: [
    [9.1829, 48.7834], // Stuttgart
    [9.15, 48.67], // Böblingen approx
    [9.0522, 48.5216], // Tübingen
  ],
  RE10: [
    [11.077, 49.4521], // Nürnberg
    [11.35, 49.0], // Allersberg approx
    [11.425, 48.765], // Ingolstadt
  ],
  MEX14: [
    [11.561, 48.1402], // München Hbf
    [11.261, 47.73], // Murnau
    [11.11, 47.492], // Garmisch-Partenkirchen
  ],
  MEX15: [
    [11.561, 48.1402], // München Hbf
    [11.95, 47.99], // Holzkirchen/Rosenheim corridor approx
    [12.1241, 47.8564], // Rosenheim
  ],
};
