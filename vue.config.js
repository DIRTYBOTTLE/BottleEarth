const CopyPlugin = require("copy-webpack-plugin");
const path = require('path');
// Cesium源码所在目录
const cesiumSource = './node_modules/cesium/Source'
const cesiumWorkers = '../Build/Cesium/Workers';

const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  productionSourceMap: false,
  transpileDependencies: true,
  devServer: {                //记住，别写错了devServer//设置本地默认端口  选填
    port: 9999,
    proxy: {                 //设置代理，必须填
      '/api': {              //设置拦截器  拦截器格式   斜杠+拦截器名字，名字可以自己定
        target: 'http://101.42.222.84:8080/ssm/',     //代理的目标地址
        // target: 'http://localhost:8080/ssm0427/',
        changeOrigin: true,              //是否设置同源，输入是的
        pathRewrite: {                   //路径重写
          '^/api': ''                     //选择忽略拦截器里面的内容
        }
      },
      '/geoserver': {              //设置拦截器  拦截器格式   斜杠+拦截器名字，名字可以自己定
        target: 'http://101.42.222.84:8080/geoserver/',     //代理的目标地址
        changeOrigin: true,              //是否设置同源，输入是的
        pathRewrite: {                   //路径重写
          '^/geoserver': ''                     //选择忽略拦截器里面的内容
        }
      },
    }
  },
  configureWebpack: {
    output: {
      sourcePrefix: ''
    },
    amd: {
      toUrlUndefined: true
    },
    resolve: {
      alias: {
        'cesium': path.resolve(__dirname, cesiumSource)
      }
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          { from: path.join(cesiumSource, cesiumWorkers), to: 'Workers' },
          { from: path.join(cesiumSource, 'Assets'), to: 'Assets' },
          { from: path.join(cesiumSource, 'Widgets'), to: 'Widgets' },
          { from: path.join(cesiumSource, 'ThirdParty/Workers'), to: 'ThirdParty/Workers' }
        ],
      })
    ],
    module: {
      unknownContextCritical: /^.\/.*$/,
      unknownContextCritical: false }}
})
