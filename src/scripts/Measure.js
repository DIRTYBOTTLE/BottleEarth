import * as Cesium from "cesium/Cesium";
import {randomPoint} from "@turf/random"
import {point, polygon} from "@turf/helpers";
import tin from "@turf/tin"
import bbox from "@turf/bbox";
import pointsWithinPolygon from "@turf/points-within-polygon";
import {B_Paint} from "@/scripts/Paint";
import Utils from "@/scripts/Utils";

export class B_Measure {
    constructor(viewer) {
        this.viewer = viewer
        this.entityCollection = []
        this.measureDataSource = new Cesium.CustomDataSource('measureData');
        this.measureCollection = this.measureDataSource.entities;
        this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.canvas)
        this.positions = []
        viewer.dataSources.add(this.measureDataSource);
    }

    clear() {
        document.body.style.cursor = "default"
        this.measureCollection.removeAll();
        this.entityCollection = [];
    }

    clearHandler() {
        this.handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK)
        this.handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK)
        this.handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE)
    }

    measureMovingPointTool(callback) {
        let handler = new Cesium.ScreenSpaceEventHandler(this.viewer.canvas)
        handler.setInputAction((event) => {
            if (event) {
                let cartesian = this.viewer.scene.globe.pick(this.viewer.camera.getPickRay(event.endPosition), this.viewer.scene);
                if (!cartesian) {
                    return
                }
                callback(Cesium.Cartographic.fromCartesian(cartesian))
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
    }

    measurePointTool() {
        Utils.notification("左键开始，右键结束", "primary")
        document.body.style.cursor = "crosshair"
        let handler = new Cesium.ScreenSpaceEventHandler(this.viewer.canvas)
        handler.setInputAction((clickEvent) => {
            let cartesian = this.viewer.scene.globe.pick(this.viewer.camera.getPickRay(clickEvent.position), this.viewer.scene);
            if (!cartesian) {
                return false;
            }
            this.measureCollection.add(B_Paint.paintPoint(cartesian, require('@/assets/cesium/点.png')))
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
        handler.setInputAction(() => {
            document.body.style.cursor = "default"
            handler.destroy()
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)
    }

    measurePolyLineTool() {
        const body = document.querySelector("body")
        body.style.cursor = "crosshair"

        let positions = [];
        let labelEntity = null; // 标签实体
        let lineEntity = null; //线实体

        let handler = new Cesium.ScreenSpaceEventHandler(this.viewer.canvas)

        // 注册鼠标左击事件
        handler.setInputAction((clickEvent) => {
            // 需要设置this.viewer.scene.globe.depthTestAgainstTerrain = true
            // let cartesian = this.viewer.scene.pickPosition(clickEvent.position);
            let cartesian = this.viewer.scene.globe.pick(this.viewer.camera.getPickRay(clickEvent.position), this.viewer.scene);
            if (!cartesian) {
                return false;
            }
            // 存储第一个点
            if (positions.length === 0) {
                positions.push(cartesian)
                this.drawPoint(cartesian);
            }
            // 存储第二个点
            if (positions.length === 2) {
                this.drawPoint(cartesian);
                this.addLine([positions[0], positions[1]]);
                labelEntity = null
                positions.shift()
                positions.push(cartesian)
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        handler.setInputAction((moveEvent) => {
            // let movePosition = this.viewer.scene.pickPosition(moveEvent.endPosition); // 鼠标移动的点
            let movePosition = this.viewer.scene.globe.pick(this.viewer.camera.getPickRay(moveEvent.endPosition), this.viewer.scene);
            if (!movePosition) {
                return false;
            }
            if (positions.length === 1) {
                positions.push(movePosition);
                // 绘制线
                lineEntity = this.addLine(positions);
            }
            if (positions.length === 2) {
                positions.pop();
                positions.push(movePosition);

                // 销毁之前label
                if (labelEntity) {
                    this.measureCollection.remove(labelEntity);
                    this.entityCollection.splice(this.entityCollection.indexOf(labelEntity), 1);
                }

                // 计算中点
                let centerPoint = Cesium.Cartesian3.midpoint(positions[0], positions[1], new Cesium.Cartesian3());
                // 计算距离
                let lengthText = "距离：" + this.getLengthText(positions[0], positions[1]);
                // 绘制实体
                labelEntity = this.addLabel(centerPoint, lengthText);
                // this.entityCollection.push(labelEntity);
            }

        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        handler.setInputAction(() => {
            body.style.cursor = "default"

            this.measureCollection.remove(lineEntity);
            this.entityCollection.splice(this.entityCollection.indexOf(lineEntity), 1);

            this.measureCollection.remove(labelEntity);
            this.entityCollection.splice(this.entityCollection.indexOf(labelEntity), 1);

            handler.destroy()
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)

    };

    measurePolyLineToGroundTool() {
        const body = document.querySelector("body")
        body.style.cursor = "crosshair"

        let positions = [];
        let labelEntity = null; // 标签实体
        let lineEntity = null; //线实体

        let handler = new Cesium.ScreenSpaceEventHandler(this.viewer.canvas)

        // 注册鼠标左击事件
        handler.setInputAction((clickEvent) => {
            let cartesian = this.viewer.scene.globe.pick(this.viewer.camera.getPickRay(clickEvent.position), this.viewer.scene);
            if (!cartesian) {
                return false;
            }
            // 存储第一个点
            if (positions.length === 0) {
                positions.push(cartesian)
                this.drawPoint(cartesian);
            }
            // 存储第二个点
            if (positions.length === 2) {
                this.drawPoint(cartesian);
                this.drawLineToGround([positions[0], positions[1]]);

                Promise.resolve(this.distanceToGround(positions[0], positions[1])).then((result) => {
                    Utils.notification("计算完成", "success")
                    let centerPoint = result[3]
                    let length = result[0]
                    // 计算距离
                    if (length > 1000) {
                        length = (length / 1000).toFixed(2) + " 公里";
                    } else {
                        length = length.toFixed(2) + " 米";
                    }
                    let lengthText = "距离：" + length;
                    // 绘制实体
                    labelEntity = this.addLabel(centerPoint, lengthText);
                    this.entityCollection.push(labelEntity);
                    labelEntity = null
                })
                positions.shift()
                positions.push(cartesian)
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        handler.setInputAction((moveEvent) => {
            // let movePosition = this.viewer.scene.pickPosition(moveEvent.endPosition); // 鼠标移动的点
            let movePosition = this.viewer.scene.globe.pick(this.viewer.camera.getPickRay(moveEvent.endPosition), this.viewer.scene);
            if (!movePosition) {
                return false;
            }
            if (positions.length === 1) {
                positions.push(movePosition);
                // 绘制线
                lineEntity = this.drawLineToGround(positions);
            }
            if (positions.length === 2) {
                positions.pop();
                positions.push(movePosition);
            }

        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        handler.setInputAction(() => {
            body.style.cursor = "default"

            this.measureCollection.remove(lineEntity);
            this.entityCollection.splice(this.entityCollection.indexOf(lineEntity), 1);

            handler.destroy()
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)

    };

    measurePolygonToGroundTool() {
        document.body.style.cursor = "crosshair"
        let positions = [];
        let handler = new Cesium.ScreenSpaceEventHandler(this.viewer.canvas)
        let linePosition = []
        let lineEntity = this.drawLineToGround(linePosition);
        handler.setInputAction((clickEvent) => {
            // 需要设置this.viewer.scene.globe.depthTestAgainstTerrain = true
            // let cartesian = this.viewer.scene.pickPosition(clickEvent.position);
            let cartesian = this.viewer.scene.globe.pick(this.viewer.camera.getPickRay(clickEvent.position), this.viewer.scene);
            if (!cartesian) {
                return false;
            }
            positions.push(cartesian)
            this.drawPoint(cartesian);
            if (positions.length > 1) {
                this.drawLineToGround(positions.slice(positions.length - 2, positions.length))
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
        handler.setInputAction((moveEvent) => {
            // let movePosition = this.viewer.scene.pickPosition(moveEvent.endPosition); // 鼠标移动的点
            if (positions.length > 0) {
                let movePosition = this.viewer.scene.globe.pick(this.viewer.camera.getPickRay(moveEvent.endPosition), this.viewer.scene);
                if (!movePosition) {
                    return false;
                }
                linePosition[0] = positions[positions.length - 1];
                linePosition[1] = movePosition;
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
        handler.setInputAction(() => {
            document.body.style.cursor = "default"
            Utils.notification("开始计算", "primary")
            this.measureCollection.remove(lineEntity);
            const draw = (cartesian3Positions) => {
                let areaPromise = this.areaPolygonToGround(cartesian3Positions)
                Promise.resolve(areaPromise).then((area) => {
                    Utils.notification("计算完成", "success")
                    this._drawPolygon(cartesian3Positions)
                    if (area > 1000000) {
                        area = (area / 1000000).toFixed(2) + "平方公里";
                    } else {
                        area = area.toFixed(2) + "平方米";
                    }
                    let areaText = "面积：" + area;
                    this.addLabel(cartesian3Positions[0], areaText);
                })
            }
            draw(positions)
            this.drawLineToGround([positions[positions.length - 1], positions[0]])
            handler.destroy()
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)
    }

    measureProfileTool(callback) {
        document.body.style.cursor = "crosshair"
        const positionCartesian3Arr = []
        const handler = new Cesium.ScreenSpaceEventHandler(this.viewer.canvas)
        // 左键添加第一个点并画出，若已存在则返回
        handler.setInputAction((event) => {
            if (positionCartesian3Arr[0]) {
                Utils.notification("右键指定终点", "danger")
                return
            }
            positionCartesian3Arr[0] = this.viewer.scene.globe.pick(this.viewer.camera.getPickRay(event.position), this.viewer.scene);
            this.drawPoint(positionCartesian3Arr[0])
            this.drawLineToGround(positionCartesian3Arr)
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
        // 若添加了第一个点，画出辅助线
        handler.setInputAction((event) => {
            if (positionCartesian3Arr[0]) {
                positionCartesian3Arr[1] = this.viewer.scene.globe.pick(this.viewer.camera.getPickRay(event.endPosition), this.viewer.scene);
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
        // 右键
        handler.setInputAction((event) => {
            handler.destroy()
            document.body.style.cursor = "default"
            positionCartesian3Arr[1] = this.viewer.scene.globe.pick(this.viewer.camera.getPickRay(event.position), this.viewer.scene);
            this.drawPoint(positionCartesian3Arr[1])
            // 计算内插点数
            let distance = Cesium.Cartesian3.distance(positionCartesian3Arr[0], positionCartesian3Arr[1]);
            let interpolationNum = Math.floor(distance / 10);
            // 得到各点笛卡尔及经纬度坐标
            const positionCartographicArr = [];
            positionCartographicArr.push(Cesium.Cartographic.fromCartesian(positionCartesian3Arr[0]));
            const newPositionCartesian3Arr = []
            newPositionCartesian3Arr.push(positionCartesian3Arr[0])
            for (let i = 1; i < interpolationNum; i++) {
                let lerp = Cesium.Cartesian3.lerp(positionCartesian3Arr[0], positionCartesian3Arr[1], i / interpolationNum, new Cesium.Cartesian3());
                positionCartographicArr.push(Cesium.Cartographic.fromCartesian(lerp));
                newPositionCartesian3Arr.push(lerp)
            }
            positionCartographicArr.push(Cesium.Cartographic.fromCartesian(positionCartesian3Arr[1]));
            newPositionCartesian3Arr.push(positionCartesian3Arr[1])
            // 得到每点的高程
            const terrainProvider = Cesium.createWorldTerrain();
            let promise = Cesium.sampleTerrain(terrainProvider, 12, positionCartographicArr);
            Promise.resolve(promise).then((positionCartographicArr) => {
                const distances = []
                const heights = []
                for (let i = 0; i < newPositionCartesian3Arr.length; i++) {
                    distances.push(Cesium.Cartesian3.distance(newPositionCartesian3Arr[0], newPositionCartesian3Arr[i]).toFixed(2))
                    heights.push(positionCartographicArr[i].height)
                }
                callback({
                    distances: distances, heights: heights
                })
            })
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)
    }

    guideCarTool() {
        document.body.style.cursor = "crosshair"
        this.handler.setInputAction((event) => {
            let cartesian = this.viewer.scene.globe.pick(this.viewer.camera.getPickRay(event.position), this.viewer.scene)
            if (!cartesian) {
                return false;
            }
            this.measureCollection.add(B_Paint.paintPoint(cartesian, require("@/assets/cesium/点.png")))
            this.positions.push(cartesian)
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
        this.handler.setInputAction(() => {
            document.body.style.cursor = "default"
            this.clearHandler()
            this.positions = Utils.cartesian3ArrToCartographicArr(this.positions)
            const length = this.positions.length
            const guidePoi = {
                orig: (this.positions[0].longitude / Math.PI * 180).toString() + "," + (this.positions[0].latitude / Math.PI * 180).toString(),
                dest: (this.positions[length - 1].longitude / Math.PI * 180).toString() + "," + (this.positions[length - 1].latitude / Math.PI * 180).toString(),
                style: "0"
            }
            if (length > 2) {
                let mid = ""
                for (let i = 1; i < length - 1; i++) {
                    mid = mid + (this.positions[i].longitude / Math.PI * 180).toString() + "," + (this.positions[i].latitude / Math.PI * 180).toString()
                }
                guidePoi.mid = mid
            }
            B_Measure.guideCar(guidePoi).then((result) => {
                this.positions = []
                console.log(result)
                result.routelatlon.forEach((item) => {
                    let lon = parseFloat(item.split(",")[0])
                    let lat = parseFloat(item.split(",")[1])
                    let cartesian = Cesium.Cartesian3.fromDegrees(lon, lat)
                    this.positions.push(cartesian)
                })
                this.measureCollection.add(B_Paint.paintPolylineGround(this.positions))
                result.routes.forEach((item) => {
                    let cartesian = Cesium.Cartesian3.fromDegrees(parseFloat(item.lon), parseFloat(item.lat))
                    this.measureCollection.add(B_Paint.paintPoint(cartesian, null, {
                        路线指引: item.strguide,
                        道路名称: item.streetName,
                        下一段道路名称: item.nextStreetName,
                        收费信息: item.tollStatus,
                        路线全长: parseFloat(result.distance).toFixed(2) + "公里",
                        行驶时间: (result.duration / 60).toFixed(2) + "分钟",
                        路线信息: item.signage
                    }))
                })
                this.positions = []
            })
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)
    }

    static poiSearch(poiForm) {
        // console.log("keyword：",poiForm.keyWord)
        return fetch("https://api.tianditu.gov.cn/v2/search?postStr=" + JSON.stringify(poiForm) + "&type=query&tk=" + tiandituTK).then((res) => {
            // res = res.data
            return res.text().then((res) => {
                res = JSON.parse(res)
                if (res.resultType === 1) {
                    return res.pois
                }
                if (res.resultType === 2) {
                    res.statistics.allAdmins.forEach((item) => {
                        item.name = item.adminName
                    })
                    return res.statistics.allAdmins
                }
                if (res.resultType === 3) {
                    return [res.area]
                }
            })
        })
    }

    static guideCar(guidePoi) {
        return fetch("https://api.tianditu.gov.cn/drive?postStr=" + JSON.stringify(guidePoi) + "&type=search&tk=" + tiandituTK)
            .then((res) => {
                return res.text().then((text) => {
                    const domParser = new DOMParser();
                    const xml = domParser.parseFromString(text, 'text/xml')
                    const result = {routes: []}

                    const routes = xml.getElementsByTagName('routes')[0]
                    const count = routes.getAttribute("count")
                    for (let i = 0; i < count; i++) {
                        let item = routes.getElementsByTagName("item")[i]
                        result.routes.push({})
                        result.routes[i].strguide = item.getElementsByTagName("strguide")[0].innerHTML
                        result.routes[i].signage = item.getElementsByTagName("signage")[0].innerHTML
                        result.routes[i].streetName = item.getElementsByTagName("streetName")[0].innerHTML
                        result.routes[i].nextStreetName = item.getElementsByTagName("nextStreetName")[0].innerHTML
                        result.routes[i].tollStatus = item.getElementsByTagName("tollStatus")[0].innerHTML
                        result.routes[i].tollStatus = (result.routes[i].tollStatus === "0") ? "免费路段" : "收费路段"
                        const turnlatlon = item.getElementsByTagName("turnlatlon")[0].innerHTML
                        const turnlatlonSplit = turnlatlon.split(",")
                        result.routes[i].lon = turnlatlonSplit[0]
                        result.routes[i].lat = turnlatlonSplit[1]
                    }

                    // 全长（公里）
                    const distance = xml.getElementsByTagName("distance")[0].innerHTML
                    result.distance = distance

                    // 行驶总时间（秒）
                    const duration = xml.getElementsByTagName("duration")[0].innerHTML
                    result.duration = duration

                    // 线路经纬度
                    const routelatlon = xml.getElementsByTagName('routelatlon')[0].innerHTML
                    result.routelatlon = routelatlon.split(";")
                    result.routelatlon.pop()

                    return result
                })
            })

    }


    drawPolygon() {
        const body = document.querySelector("body")
        body.style.cursor = "crosshair"
        let positions = [];
        let handler = new Cesium.ScreenSpaceEventHandler(this.viewer.canvas)
        let linePosition = []
        let lineEntity = this.drawLineToGround(linePosition);
        handler.setInputAction((clickEvent) => {
            // 需要设置this.viewer.scene.globe.depthTestAgainstTerrain = true
            // let cartesian = this.viewer.scene.pickPosition(clickEvent.position);
            let cartesian = this.viewer.scene.globe.pick(this.viewer.camera.getPickRay(clickEvent.position), this.viewer.scene);
            if (!cartesian) {
                return false;
            }
            positions.push(cartesian)
            this.drawPoint(cartesian);
            if (positions.length > 1) {
                this.drawLineToGround(positions.slice(positions.length - 2, positions.length))
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
        handler.setInputAction((moveEvent) => {
            // let movePosition = this.viewer.scene.pickPosition(moveEvent.endPosition); // 鼠标移动的点
            if (positions.length > 0) {
                let movePosition = this.viewer.scene.globe.pick(this.viewer.camera.getPickRay(moveEvent.endPosition), this.viewer.scene);
                if (!movePosition) {
                    return false;
                }
                linePosition[0] = positions[positions.length - 1];
                linePosition[1] = movePosition;
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
        handler.setInputAction(() => {
            body.style.cursor = "default"
            Utils.notification("开始计算", "primary")
            this.measureCollection.remove(lineEntity);
            // const draw = (cartesian3Positions) => {
            //     let areaPromise = this.areaPolygonToGround(cartesian3Positions)
            //     Promise.resolve(areaPromise).then((area) => {
            //         ElNotification({
            //             title: '贴地面积', message: "计算完成", type: 'success', position: 'top-left',
            //         })
            //         this._drawPolygon(cartesian3Positions)
            //         if (area > 1000000) {
            //             area = (area / 1000000).toFixed(2) + "平方公里";
            //         } else {
            //             area = area.toFixed(2) + "平方米";
            //         }
            //         let areaText = "面积：" + area;
            //         this.addLabel(cartesian3Positions[0], areaText);
            //     })
            // }
            // draw(positions)
            this.drawLineToGround([positions[positions.length - 1], positions[0]])
            this._drawPolygon(positions)
            handler.destroy()
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)
    }

    /*
    * @param cartesian3 Cartesian3
    * */
    drawPoint(cartesian3) {
        this.entityCollection.push(this.measureCollection.add(new Cesium.Entity({
            position: cartesian3, point: {
                color: Cesium.Color.fromCssColorString('#D75624'),
                pixelSize: 8,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            }
        })));
    }

    addLine(positions) {
        let dynamicPositions = new Cesium.CallbackProperty(() => {
            return positions;
        }, false);
        let lineEntity = this.measureCollection.add(new Cesium.Entity({
            name: '线', polyline: {
                positions: dynamicPositions,
                width: 2,
                arcType: Cesium.ArcType.NONE,
                material: Cesium.Color.fromCssColorString('#85AB77'), //获取或设置折线的表面外观
            }
        }))
        this.entityCollection.push(lineEntity);
        return lineEntity;
    };

    /*
    * @param cartesian3Arr Cartesian3数组
    * */
    drawLineToGround(cartesian3Arr) {
        let dynamicPositions = new Cesium.CallbackProperty(() => {
            return cartesian3Arr;
        }, false);
        let lineEntity = this.measureCollection.add(new Cesium.Entity({
            name: '线', polyline: {
                positions: dynamicPositions,
                width: 2,
                arcType: Cesium.ArcType.RHUMB,
                material: Cesium.Color.fromCssColorString('#85AB77'), //获取或设置折线的表面外观
                clampToGround: true
            }
        }))
        this.entityCollection.push(lineEntity);
        return lineEntity;
    };

    _drawPolygon(positions) {
        let dynamicPositions = new Cesium.CallbackProperty(() => {
            return new Cesium.PolygonHierarchy(positions);
        }, false);
        this.entityCollection.push(this.measureCollection.add(new Cesium.Entity({
            polygon: {
                hierarchy: dynamicPositions,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                material: Cesium.Color.fromCssColorString('#66DA9A').withAlpha(0.5), // classificationType: Cesium.ClassificationType.BOTH // 贴地表和贴模型,如果设置了，这不能使用挤出高度
            }
        })));
    };

    addLabel(centerPoint, text) {
        return this.measureCollection.add(new Cesium.Entity({
            position: centerPoint, label: {
                text: text, font: '14px sans-serif', style: Cesium.LabelStyle.FILL_AND_OUTLINE, //FILL  FILL_AND_OUTLINE OUTLINE
                fillColor: Cesium.Color.YELLOW, showBackground: true, //指定标签后面背景的可见性
                backgroundColor: new Cesium.Color(0.165, 0.165, 0.165, 0.8), // 背景颜色
                backgroundPadding: new Cesium.Cartesian2(6, 6), //指定以像素为单位的水平和垂直背景填充padding
                pixelOffset: new Cesium.Cartesian2(0, -25), disableDepthTestDistance: Number.POSITIVE_INFINITY
            }
        }));
    };

    getLengthText(firstPoint, secondPoint) {
        // 计算距离
        let length = Cesium.Cartesian3.distance(firstPoint, secondPoint);
        if (length > 1000) {
            length = (length / 1000).toFixed(2) + " 公里";
        } else {
            length = length.toFixed(2) + " 米";
        }
        return length;
    };


    /*
    * 贴线距离
    * @param left 起点 right 终点
    * */
    async distanceToGround(left, right) {
        let linearDistance = Cesium.Cartesian3.distance(left, right);
        let count = Math.floor(linearDistance);

        // 得到各点经纬度坐标
        let positions = [];
        let startCartographic = Cesium.Cartographic.fromCartesian(left);
        let endCartographic = Cesium.Cartographic.fromCartesian(right);
        positions.push(startCartographic);
        for (let i = 1; i < count; i++) {
            let cart = Cesium.Cartesian3.lerp(left, right, i / count, new Cesium.Cartesian3());
            positions.push(Cesium.Cartographic.fromCartesian(cart));
        }
        positions.push(endCartographic);

        const terrainProvider = Cesium.createWorldTerrain();
        // let promise = Cesium.sampleTerrainMostDetailed(
        //     this.viewer.terrainProvider,
        //     positions
        // );
        let promise = Cesium.sampleTerrain(terrainProvider, 12, positions);
        return Promise.resolve(promise).then(function (updatedPositions) {
            // positions[0].height and positions[1].height have been updated.
            // updatedPositions is just a reference to positions.
            let surfaceDistance = 0;
            for (let i = 0; i < updatedPositions.length; i++) {
                if (i === updatedPositions.length - 1) continue;
                surfaceDistance += Cesium.Cartesian3.distance(Cesium.Cartesian3.fromRadians(updatedPositions[i].longitude, updatedPositions[i].latitude, updatedPositions[i].height), Cesium.Cartesian3.fromRadians(updatedPositions[i + 1].longitude, updatedPositions[i + 1].latitude, updatedPositions[i + 1].height));
            }
            return [surfaceDistance, left, right, Cesium.Cartesian3.fromRadians(updatedPositions[Math.floor(updatedPositions.length / 2)].longitude, updatedPositions[Math.floor(updatedPositions.length / 2)].latitude, updatedPositions[Math.floor(updatedPositions.length / 2)].height)];
        });
    }

    /*
    * 计算贴地多边形面积
    * @param position 多边形顶点Cartesian3数组
    * */
    async areaPolygonToGround(cartesian3Arr) {
        // 1.笛卡尔转换为WGS-84坐标组(单位radios) P.S.过程相当于投影到椭球面
        let cartographicArr = this.cartesian3ArrToCartographicArr(cartesian3Arr)
        // 2.WGS-84坐标组转换为TurfPolygon
        let turfPolygon = this.CartographicToTurfPolygon(cartographicArr)
        // 3.计算TurfPolygon的外接范围
        let turfBbox = bbox(turfPolygon)
        // 4.判断内插点数 100米/2点
        let interpolationNum = Math.ceil((turfBbox[2] - turfBbox[0]) / Math.PI * 180 * 110000 / 50)
        // 5.生成随机点
        let randomPt = randomPoint(interpolationNum, {bbox: turfBbox})
        // 6.求随机点与TurfPolygon交集得到插值点
        let interpolationPoint = pointsWithinPolygon(randomPt, turfPolygon)
        // 7.将TurfPolygon各顶点加入插值点(并去重)
        for (let i = 0; i < turfPolygon.geometry.coordinates[0].length - 1; i++) {
            interpolationPoint.features.push(point(turfPolygon.geometry.coordinates[0][i]))
        }
        // 8.生成TIN三角网
        let tinPolygon = tin(interpolationPoint)
        // 9.TurfTIN转换为WGS-84三角网，添加高程
        let tinCartographicArrArr = []
        for (let i = 0; i < tinPolygon.features.length; i++) {
            let promise = this.turfPolygonToCartographicArr(tinPolygon.features[i])
            await Promise.resolve(promise).then((tinCartographicArr) => {
                tinCartographicArrArr.push(tinCartographicArr)
            })
        }
        // 10.WGS-84转为笛卡尔三角网
        let tinCartesianArrArr = []
        tinCartographicArrArr.forEach((tinCartographicArr) => {
            let tinCartesianArr = []
            tinCartographicArr.forEach((cartographic) => {
                let tem = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, cartographic.height)
                tinCartesianArr.push(tem)
            })
            tinCartesianArrArr.push(tinCartesianArr)
        })
        // 11.计算每个三角形的面积
        let area = 0
        tinCartesianArrArr.forEach((tinCartesianArr) => {
            area += this.areaSpaceTriangle([tinCartesianArr[0].x, tinCartesianArr[0].y, tinCartesianArr[0].z], [tinCartesianArr[1].x, tinCartesianArr[1].y, tinCartesianArr[1].z], [tinCartesianArr[2].x, tinCartesianArr[2].y, tinCartesianArr[2].z])
        })
        // 12.返回结果
        return (area)
    }

    /*
    * 笛卡尔坐标数组转换为WGS-84坐标系数组
    * @param cartesian3Arr 笛卡尔坐标数组
    * */
    cartesian3ArrToCartographicArr(cartesian3Arr) {
        let cartographicArr = []
        cartesian3Arr.forEach((item) => {
            cartographicArr.push(Cesium.Cartographic.fromCartesian(item))
        })
        return cartographicArr
    }

    /*
    * WGS-84坐标系数组转换为turf多边形
    * */
    CartographicToTurfPolygon(cartographicArr) {
        let linearRings = [[]]
        cartographicArr.forEach((item) => {
            linearRings[0].push([item.longitude, item.latitude])
        })
        //首尾相连
        linearRings[0].push([cartographicArr[0].longitude, cartographicArr[0].latitude])
        return polygon(linearRings)
    }

    turfPolygonToCartographicArr(turfPolygon) {
        let cartographicArr = []
        turfPolygon.geometry.coordinates[0].forEach((item) => {
            cartographicArr.push(new Cesium.Cartographic(item[0], item[1]))
        })
        // 去除重复的终点
        cartographicArr.pop()
        const terrainProvider = Cesium.createWorldTerrain();
        return Cesium.sampleTerrain(terrainProvider, 12, cartographicArr);
    }

    /*
    * 计算空间三角形面积
    * */
    areaSpaceTriangle(a, b, c) {
        let x1 = b[0] - a[0]
        let y1 = b[1] - a[1]
        let z1 = b[2] - a[2]
        let x2 = c[0] - a[0]
        let y2 = c[1] - a[1]
        let z2 = c[2] - a[2]
        let ABxAC = [y1 * z2 - y2 * z1, -x1 * z2 + x2 * z1, x1 * y2 - x2 * y1]
        return 1 / 2 * Math.sqrt(ABxAC[0] * ABxAC[0] + ABxAC[1] * ABxAC[1] + ABxAC[2] * ABxAC[2])
    }

}