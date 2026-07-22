export const environment = {
  production: true,
  // The API this dashboard used to read from has been retired, so it runs on generated sample data
  // by default. Set useDummyData to false and point apiHost at your own deployment of the server/
  // folder to show real data again.
  useDummyData: true,
  apiHost: 'https://api.coronastatistics.live'
};
