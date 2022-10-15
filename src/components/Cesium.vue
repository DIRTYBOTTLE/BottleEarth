<template>
  <!-- Cesium容器 -->
  <div id="cesiumContainer" style="height: 100vh"></div>

  <div class="title-bg-container">
    <div class="title-bg-tool">

      <div class="dropdown">
        <div class="tool" data-bs-toggle="dropdown" aria-expanded="false">
          <img :src="require('@/assets/cesium/测量.png')">
        </div>
        <ul class="dropdown-menu">
          <li><a class="dropdown-item" href="javascript:void(0)" @click="measure.measurePolyLineTool">欧式距离</a></li>
          <li><a class="dropdown-item" href="javascript:void(0)" @click="measure.measurePolyLineToGroundTool">贴地距离</a>
          </li>
          <li><a class="dropdown-item" href="javascript:void(0)" @click="measure.measurePolygonToGroundTool">贴地面积</a>
          </li>
          <li><a class="dropdown-item" href="javascript:void(0)" @click="measure.measureProfileTool">剖面测量</a></li>
          <li><a class="dropdown-item" href="javascript:void(0)" @click="measure.measurePointTool">点位测量</a></li>
          <li><a class="dropdown-item" href="javascript:void(0)" @click="measure.guideCarTool">路线导航</a></li>
          <li><a class="dropdown-item" href="javascript:void(0)" @click="measure.clear">清除测量</a></li>
        </ul>
      </div>

      <div class="dropdown">
        <div class="tool" data-bs-toggle="dropdown" aria-expanded="false">
          <img :src="require('@/assets/cesium/绘制.png')">
        </div>
        <ul class="dropdown-menu">
          <li><a class="dropdown-item" href="javascript:void(0)" @click="paint.paintPointTool">空间点位</a></li>
          <li><a class="dropdown-item" href="javascript:void(0)" @click="paint.paintPolylineTool">空间直线</a></li>
          <li><a class="dropdown-item" href="javascript:void(0)" @click="paint.paintPolylineGroundTool">贴地直线</a></li>
          <li><a class="dropdown-item" href="javascript:void(0)" @click="paint.paintPolygonTool">贴地面体</a></li>
          <li><a class="dropdown-item" href="javascript:void(0)" @click="paint.clear">清除绘制</a></li>
        </ul>
      </div>

      <div class="dropdown">
        <div class="tool" data-bs-toggle="dropdown" aria-expanded="false">
          <img :src="require('@/assets/cesium/位置.png')">
        </div>
        <ul class="dropdown-menu">
          <li><a class="dropdown-item" href="javascript:void(0)"
                 @click="flyToFromDegree(114.35590,30.529938)">武汉大学区域</a></li>
          <li><a class="dropdown-item" href="javascript:void(0)" @click="flyToFromDegree(104.537499,31.871504,1000)">黄家坝示范区</a>
          </li>
        </ul>
      </div>

      <div class="tool" @click="showTree">
        <img :src="require('@/assets/cesium/图层.png')">
      </div>

      <div class="dropdown">
        <div class="tool" data-bs-toggle="dropdown" aria-expanded="false">
          <img :src="require('@/assets/cesium/警告.png')">
        </div>
        <ul class="dropdown-menu">
          <li><a class="dropdown-item" href="javascript:void(0)" @click="paint.paintWave">沪定地震</a></li>
        </ul>
      </div>

      <div class="dropdown">
        <div data-bs-toggle="dropdown" class="d-inline-flex" aria-expanded="false">
          <input type="text" placeholder="地名检索" v-model="poiForm.keyWord" style="width: 100%">
          <span><div class="tool" style="height: 35px;margin-left: 0;margin-top: 3px;border-radius: 0"
                     @click="measure.suggestPoi()">
          <img :src="require('@/assets/cesium/搜索.png')" style="height: 25px;width: 25px"></div>
          </span>
        </div>
        <ul style="width: 100%" id="dm">
          <li v-for="item in poi">
            <a class="dropdown-item" href="javascript:void(0)" @click="measure.selectPoi(item)"> {{ item.name }}</a>
          </li>
        </ul>
      </div>


    </div>
    <div class="title-bg"></div>
    <div class="title-bg-tool">
    </div>
  </div>
  <div class="title">应急水源智能决策系统</div>
  <div style="position: absolute;bottom: 0;left: 0;color: white">经度 {{ screenPoint.lon }} 纬度 {{ screenPoint.lat }} 高程
    {{ screenPoint.height }}
  </div>

  <div class="offcanvas offcanvas-bottom" style="height: 70vh" tabindex="-1" id="myOffcanvas"
       aria-labelledby="offcanvasBottomLabel">
    <div class="offcanvas-header">
      <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
    </div>
    <div class="offcanvas-body" id="echartsContainer">
    </div>
  </div>

  <div class="offcanvas offcanvas-start" style="width: 30vh" tabindex="-1" id="treeOffcanvas"
       aria-labelledby="offcanvasBottomLabel">
    <el-tree :data="layer" @check-change="handleCheckChange" show-checkbox default-expand-all/>
  </div>

</template>

<script>
import {nextTick, onMounted, ref} from "vue";
import {B_Cesium} from "@/scripts/BottleCesium";
import * as widgets from "cesium/Widgets/widgets.css";
import {B_Measure} from "@/scripts/Measure";
import Utils from "@/scripts/Utils";
import * as Cesium from "cesium/Cesium";

export default {
  name: "cesium",
  setup() {
    let cesium
    const screenPoint = ref({})
    const poiForm = ref({
      // 查询关键字
      keyWord: "",
      // 查询范围
      mapBound: "0,0,180,90",
      // 查询级别1-18
      level: 18,
      // 指定行政区域的9位国标码
      // specify: "",
      // 搜索类型 1普通搜索 7地名搜索
      queryType: 1,
      // 返回结果起始位
      start: 0,
      // 返回结果条数
      count: 6,
      // 数据分类（分类编码表）
      // dataTypes:"",
      // 返回poi结果级别 1基本poi 2 详细poi
      show: 2
    })
    const poi = ref([])
    const paint = {
      paintPointTool() {
        cesium.paint.paintPointTool()
      },
      paintPolylineTool() {
        cesium.paint.paintPolylineTool()
      },
      paintPolylineGroundTool() {
        cesium.paint.paintPolylineGroundTool()
      },
      paintPolygonTool() {
        cesium.paint.paintPolygonTool()
      },
      paintWave() {
        cesium.paint.addWave(102.230282, 29.910397, 2000, {
          r: 255,
          g: 0,
          b: 0,
          a: 0.6
        }, 2e3, 3, 0);
      },
      clear() {
        cesium.paint.clear()
      }
    }

    const layer = [
      {
        label: '北川',
        children: [
          {
            label: '地下水源',
            category: 'water',
            name: 'underground',
            icon: require('@/assets/cesium/地下水滴.png'),
            show: false
          },
          {
            label: '地表水源',
            category: 'water',
            name: 'surface',
            icon: require('@/assets/cesium/地表水滴.png'),
            show: false
          },
          {
            label: '地质灾害',
            category: 'water',
            name: 'disaster',
            icon: require('@/assets/cesium/地质灾害.png'),
            show: false
          },
          {
            label: '水文地质',
            category: 'water',
            name: 'shuiwen',
            show: false
          },
        ],
      },
      {
        label: '天地图数据',
        children: [
          {
            label: '铁路',
            url: "https://gisserver.tianditu.gov.cn/TDTService/wfs",
            name: 'LRRL',
            count: "1000",
            icon: require('@/assets/cesium/地下水滴.png'),
            show: false
          },
          {
            label: '公路',
            url: "https://gisserver.tianditu.gov.cn/TDTService/wfs",
            name: 'LRDL',
            count: "1000",
            icon: require('@/assets/cesium/地下水滴.png'),
            show: false
          },
          {
            label: '水系面',
            url: "https://gisserver.tianditu.gov.cn/TDTService/wfs",
            name: 'HYDA',
            count: "1000",
            icon: require('@/assets/cesium/地下水滴.png'),
            show: false
          },
          {
            label: '水系线',
            url: "https://gisserver.tianditu.gov.cn/TDTService/wfs",
            name: 'HYDL',
            count: "1000",
            icon: require('@/assets/cesium/地下水滴.png'),
            show: false
          },
          {
            label: '居民地及设施面',
            url: "https://gisserver.tianditu.gov.cn/TDTService/wfs",
            category: 'TDTService',
            name: 'RESA',
            bbox: "31,104,32,105",
            show: false
          },
          {
            label: '居民地及设施点',
            url: "https://gisserver.tianditu.gov.cn/TDTService/wfs",
            category: 'TDTService',
            name: 'RESP',
            count: "1000",
            icon: require('@/assets/cesium/地下水滴.png'),
            show: false
          },
          {
            label: '美国人口',
            url: "/geoserver/topp/ows",
            category: "topp",
            name: "states",
            show: false
          }
        ]
      }
    ]
    const showTree = () => {
      const treeOffcanvas = new bootstrap.Offcanvas('#treeOffcanvas')
      treeOffcanvas.show()
    }
    const handleCheckChange = (data) => {
      if (data.show === true) {
        cesium._viewer.dataSources.remove(cesium._viewer.dataSources.getByName(data.name)[0], true)
        data.show = false
      } else if (data.show === false) {
        cesium.dataSource.loadGeoJSON(data)
        data.show = true
      }
    }

    const measure = {
      _updateScreenPoint(cartesian) {
        screenPoint.value.lon = (cartesian.longitude / Math.PI * 180).toFixed(2)
        screenPoint.value.lat = (cartesian.latitude / Math.PI * 180).toFixed(2)
        screenPoint.value.height = (cartesian.height).toFixed(0)
      },
      measureMovingPointTool() {
        cesium.measure.measureMovingPointTool(this._updateScreenPoint)
      },
      measurePointTool() {
        cesium.measure.measurePointTool()
      },
      measurePolyLineTool() {
        cesium.measure.measurePolyLineTool()
      },
      measurePolyLineToGroundTool() {
        cesium.measure.measurePolyLineToGroundTool()
      },
      measurePolygonToGroundTool() {
        cesium.measure.measurePolygonToGroundTool()
      },
      guideCarTool() {
        cesium.measure.guideCarTool()
      },
      suggestPoi() {
        if (poiForm.value.keyWord === "") {
          document.getElementById("dm").className = ""
          return
        }
        document.getElementById("dm").classList.add("dropdown-menu")
        document.getElementById("dm").classList.add("show")
        // console.log(poiForm.value)
        poi.value = [{name: "查询中......"}]
        B_Measure.poiSearch(poiForm.value).then((res) => {
          // console.log(res)
          poi.value = res
          // console.log(poi.value)
          // console.log(poi.value.length)
        })
      },
      selectPoi(item) {
        const lon = parseFloat(item.lonlat.split(",")[0])
        const lat = parseFloat(item.lonlat.split(",")[1])
        cesium.camera.flyToFromDegree(lon, lat)
        let message = ""
        message += (item.name ? "名称：" + item.name + "<br>" : "")
        message += (item.phone ? "电话：" + item.phone + "<br>" : "")
        message += (item.address ? "地址：" + item.address + "<br>" : "")
        message += (item.lonlat ? "经度：" + item.lonlat.split(",")[0] + "<br>" : "")
        message += (item.lonlat ? "纬度：" + item.lonlat.split(",")[1] + "<br>" : "")
        message += (item.poiType ? (item.poiType === "101" ? "类型：POI数据<br>" : "类型：公交站点<br>") : "")
        message += (item.eaddress ? "英文地址：" + item.eaddress + "<br>" : "")
        message += (item.ename ? "英文名称：" + item.ename + "<br>" : "")
        message += (item.hotPointID ? "热点id：" + item.hotPointID + "<br>" : "")
        message += (item.province ? "省直属：" + item.province + "<br>" : "")
        message += (item.provinceCode ? "省行政区编码：" + item.provinceCode + "<br>" : "")
        message += (item.city ? "市直属：" + item.city + "<br>" : "")
        message += (item.cityCode ? "市行政区编码：" + item.cityCode + "<br>" : "")
        message += (item.county ? "区县直属：" + item.county + "<br>" : "")
        message += (item.countyCode ? "区县行政区编码：" + item.countyCode + "<br>" : "")
        message += (item.source ? "数据来源：" + item.source + "<br>" : "")
        message += (item.typeCode ? "分类编码：" + item.typeCode + "<br>" : "")
        message += (item.typeName ? "分类名称：" + item.typeName + "<br>" : "")
        // message += (item.bound ? "范围：" + item.bound + "<br>" : "")
        message += (item.adminCode ? "行政区编码：" + item.adminCode + "<br>" : "")
        message += (item.level ? "显示级别：" + item.level + "<br>" : "")
        message += (item.count ? "要素数量：" + item.count + "<br>" : "")
        Utils.notification(message, "success")
      },
      clear() {
        cesium.measure.clear()
      },
      measureProfileTool() {
        const drawProfile = (profile) => {
          // drawerProfile.value = true
          nextTick(() => {
            const chartDom = document.getElementById('echartsContainer');
            const myChart = echarts.init(chartDom);
            let option;

            option = {
              title: {
                text: '剖面图'
              },
              // grid: {
              //   left: '6%',
              //   right: '6%',
              //   bottom: '6%',
              //   // containLabel: true,
              // },
              toolbox: {
                feature: {
                  saveAsImage: {}
                },
              },
              xAxis: {
                name: '距离',
                type: 'category',
                boundaryGap: false,
                data: profile.distances,
                axisPointer: {
                  show: 'true',
                  // type: 'cross',
                  snap: 'true',
                  label: {
                    precision: '3'
                  },
                },
                // axisPointer: {
                //   label: {
                //     show: true,
                //     precision:2
                //   },
                // },
              },
              yAxis: {
                name: '海拔',
                type: 'value',
                min: 'dataMin',
                axisTick: {
                  show: 'false'
                },
                axisLabel: {
                  show: 'false'
                },
                axisPointer: {
                  show: 'true',
                  snap: 'true',
                  type: 'shadow',
                  label: {
                    // show: 'true',
                    precision: '2'
                  },
                },
              },
              series: [
                {
                  data: profile.heights,
                  type: 'line',
                  smooth: true,
                  areaStyle: {}
                }
              ]
            };

            option && myChart.setOption(option);

            const bsOffcanvas = new bootstrap.Offcanvas('#myOffcanvas')
            bsOffcanvas.show()
          })

        }

        cesium.measure.measureProfileTool(drawProfile)
      }
    }

    const flyToFromDegree = (lon, lat, height) => {
      cesium.camera.flyToFromDegree(lon, lat, height)
    }

    onMounted(() => {
      cesium = new B_Cesium('cesiumContainer')
      measure.measureMovingPointTool();

      function specialEffects() {
        Cesium.CircleWaveMaterialProperty = CircleWaveMaterialProperty
        Cesium.Material.CircleWaveMaterialType = 'CircleWaveMaterial'
        Cesium.Material.CircleWaveSource = `czm_material czm_getMaterial(czm_materialInput materialInput)\n
    {\n
        czm_material material = czm_getDefaultMaterial(materialInput);\n
        material.diffuse = 1.5 * color.rgb;\n
        vec2 st = materialInput.st;\n
        vec3 str = materialInput.str;\n
        float dis = distance(st, vec2(0.5, 0.5));\n
        float per = fract(time);\n
        if (abs(str.z) > 0.001) {\n
            discard;\n
        }\n
        if (dis > 0.5) { \n
            discard; \n
        } else { \n
            float perDis = 0.5 / count;\n
            float disNum; \n
            float bl = .0; \n
            for (int i = 0; i <= 999; i++) { \n
                if (float(i) <= count) { \n
                  disNum = perDis *
    float(i) - dis + per / count; \n
                    if (disNum > 0.0) { \n
                        if (disNum < perDis) { \n
                            bl = 1.0 - disNum / perDis;\n
                        }\n
                      else if
    (disNum - perDis < perDis) { \n
                                bl = 1.0 - abs(1.0 - disNum / perDis); \n
                        } \n
                        material.alpha = pow(bl, gradient); \n
                    } \n
                } \n
            } \n
        } \n
    return material; \n
    } \n`

        function CircleWaveMaterialProperty(color, duration, count, gradient) {
          this._definitionChanged = new Cesium.Event()
          this._color = undefined
          this._colorSubscription = undefined
          this.color = color
          this.duration = Cesium.defaultValue(duration, 1e3)
          this.count = Cesium.defaultValue(count, 2)
          if (this.count <= 0) this.count = 1
          this.gradient = Cesium.defaultValue(gradient, 0.1)
          if (this.gradient < 0) this.gradient = 0
          else if (this.gradient > 1) this.gradient = 1
          this._time = performance.now()
        }

        Object.defineProperties(CircleWaveMaterialProperty.prototype, {
          isConstant: {
            get: function () {
              return false
            }
          },
          definitionChanged: {
            get: function () {
              return this._definitionChanged
            }
          },
          color: Cesium.createPropertyDescriptor('color')
        })

        CircleWaveMaterialProperty.prototype.getType = function (time) {
          return Cesium.Material.CircleWaveMaterialType
        }

      }
    })

    return {
      paint,
      flyToFromDegree,
      measure,
      screenPoint,
      poi,
      poiForm,
      layer,
      handleCheckChange,
      showTree
    }
  }
}
</script>

<style scoped>

.title {
  font-size: 50px;
  color: white;
  position: absolute;
  left: 50%;
  top: 0;
  transform: translate(-50%, 0);
}

.title-bg-container {
  position: absolute;
  top: -3px;
  left: 0;
  display: flex;
  justify-content: space-between;
  width: 100vw;
  perspective: 1000px;
}

.title-bg {
  background-color: rgba(144, 108, 251, 0.8);
  height: 70px;
  width: 40%;
  transform: rotateX(-30deg);
  box-shadow: 0 3px 10px rgba(255, 255, 255, 0.8);
  perspective: 1000px;
}

.title-bg-tool {
  background-color: rgba(144, 108, 251, 0.8);
  height: 50px;
  width: 25%;
  box-shadow: 0 3px 10px rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: row-reverse;
  padding-top: 6px;
  padding-left: 10px;
  padding-right: 10px;
}


.tool {
  background-color: rgba(255, 255, 255, 0.8);
  height: 40px;
  width: 40px;
  padding: 5px;
  border-radius: 5px;
  margin-left: 10px;
  cursor: pointer;
}

.tool img {
  width: 30px;
}

:deep(.cesium-viewer-toolbar) {
  z-index: 999;
}

.title-bg-tool input {
  border: 2px solid #f0f0f0;
  display: block;
  width: 100px;
  padding: 5px;
  font-size: 20px;
  margin-top: 3px;
  height: 35px;
}
</style>