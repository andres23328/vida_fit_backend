const KMeans = require('ml-kmeans');

// Función para entrenar el modelo KMeans
const trainModel = (data) => {
    const clusters = 3; // Define el número de clusters
    const result = KMeans(data, clusters);
    return result;
};

module.exports = { trainModel };
