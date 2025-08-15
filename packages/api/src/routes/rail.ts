// Approximate railway polylines for demo path-following (lon, lat)
export const railPolylineByLine: Record<string, [number, number][]> = {
  RE9: [
    [9.9829, 48.3994], // Ulm Hbf
    [10.1030, 48.4300],
    [10.2000, 48.4500],
    [10.2777, 48.4556], // Günzburg
    [10.4200, 48.4400],
    [10.6500, 48.4200],
    [10.7800, 48.3900],
    [10.8855, 48.3651] // Augsburg Hbf
  ],
  MEX16: [
    [9.1816, 48.7836], // Stuttgart Hbf
    [9.3000, 48.7600],
    [9.5000, 48.7300],
    [9.6520, 48.7055], // Göppingen
    [9.8000, 48.6400],
    [9.9000, 48.5200],
    [9.9829, 48.3994] // Ulm Hbf
  ],
  RE8: [
    [9.1829, 48.7834], // Stuttgart
    [9.4270, 48.9500],
    [9.7370, 49.1110],
    [9.9530, 49.7940] // Würzburg (approx)
  ],
  RE7: [
    [9.1829, 48.7834], // Stuttgart
    [9.1500, 48.6700], // Böblingen approx
    [9.0522, 48.5216]  // Tübingen
  ],
  RE10: [
    [11.0770, 49.4521], // Nürnberg
    [11.3500, 49.0000], // Allersberg approx
    [11.4250, 48.7650]  // Ingolstadt
  ],
  MEX14: [
    [11.5610, 48.1402], // München Hbf
    [11.2610, 47.7300], // Murnau
    [11.1100, 47.4920]  // Garmisch-Partenkirchen
  ],
  MEX15: [
    [11.5610, 48.1402], // München Hbf
    [11.9500, 47.9900], // Holzkirchen/Rosenheim corridor approx
    [12.1241, 47.8564]  // Rosenheim
  ]
};


