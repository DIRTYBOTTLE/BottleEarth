import * as Cesium from "cesium/Cesium";
import Utils from "@/scripts/Utils";

const CircleWaveSource = `czm_material czm_getMaterial(czm_materialInput materialInput)\n
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
    return 'myMaterial';
}
CircleWaveMaterialProperty.prototype.getValue = function (time, result) {
    if (!Cesium.defined(result)) {
        result = {}
    }
    result.color = Cesium.Property.getValueOrClonedDefault(this._color, time, Cesium.Color.WHITE, result.color)
    result.time = (((new Date()).getTime() - this._time) % this.duration) / this.duration
    result.count = this.count
    result.gradient = 1 + 10 * (1 - this.gradient)
    return result
}
CircleWaveMaterialProperty.prototype.equals = function (other) {
    return this === other ||
        (other instanceof CircleWaveMaterialProperty &&
            Cesium.Property.equals(this._color, other._color))
}
Cesium.Material._materialCache.addMaterial('myMaterial', {
    fabric: {
        uniforms: {
            color: new Cesium.Color(1.0, 0.0, 0.0, 1.0),
            time: 1,
            count: 1,
            gradient: 0.1
        },
        source: CircleWaveSource
    },
    translucent: function (material) {
        return !0
    }
})

function addCircleWave(lon, lat, radius, color, duration, count, gradient) {
    return new Cesium.Entity({
        position: new Cesium.Cartesian3.fromDegrees(lon, lat, 0),
        ellipse: {
            // height: 0, // 线圈的高度
            semiMinorAxis: radius, // 线圈的横向长度
            semiMajorAxis: radius, // 线圈的竖向长度
            material: new CircleWaveMaterialProperty(Cesium.Color.fromCssColorString(`rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`), duration, count, gradient), // 第一个参数是线圈的颜色，第二个参数是线圈的个数
        }
    })
}

export class B_Paint {
    constructor(viewer) {
        this.viewer = viewer
        this.paintDataSource = new Cesium.CustomDataSource('paint');
        this.viewer.dataSources.add(this.paintDataSource);
        this.paintEntities = this.paintDataSource.entities
        this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.canvas)
    }

    clear() {
        document.body.style.cursor = "default"
        this.paintEntities.removeAll()
        this._clearHandler()
    }

    _clearHandler() {
        this.handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK)
        this.handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK)
        this.handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE)
    }

    paintPointTool() {
        Utils.notification("左键开始，右键结束", "primary")
        document.body.style.cursor = "crosshair"
        this.handler.setInputAction((clickEvent) => {
            let cartesian = this.viewer.scene.globe.pick(this.viewer.camera.getPickRay(clickEvent.position), this.viewer.scene);
            if (!cartesian) {
                return false;
            }
            this.paintEntities.add(B_Paint.paintPoint(cartesian))
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
        this.handler.setInputAction(() => {
            document.body.style.cursor = "default"
            this._clearHandler()
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)
    }

    paintPolylineTool() {
        Utils.notification("左键开始，右键结束", "primary")
        let mouseMove
        document.body.style.cursor = "crosshair"
        const cartesian3Arr = []
        this.paintEntities.add(B_Paint.paintPolyline(cartesian3Arr))
        this.handler.setInputAction((event) => {
            cartesian3Arr.pop()
            cartesian3Arr.push(this.viewer.scene.globe.pick(this.viewer.camera.getPickRay(event.position), this.viewer.scene))
            this.paintEntities.add(B_Paint.paintPoint(cartesian3Arr.slice(cartesian3Arr.length - 1, cartesian3Arr.length)[0]))
            mouseMove = false
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
        // 若添加了第一个点，画出辅助线
        this.handler.setInputAction((event) => {

            if (cartesian3Arr[0]) {
                if (!mouseMove) {
                    cartesian3Arr.push(this.viewer.scene.globe.pick(this.viewer.camera.getPickRay(event.endPosition), this.viewer.scene))
                    mouseMove = true
                } else {
                    cartesian3Arr.pop()
                    cartesian3Arr.push(this.viewer.scene.globe.pick(this.viewer.camera.getPickRay(event.endPosition), this.viewer.scene))
                }
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
        // 右键
        this.handler.setInputAction(() => {
            document.body.style.cursor = "defalut"
            cartesian3Arr.pop()
            this._clearHandler()
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)
    }

    paintPolylineGroundTool() {
        Utils.notification("左键开始，右键结束", "primary")
        let mouseMove
        document.body.style.cursor = "crosshair"
        const cartesian3Arr = []
        this.paintEntities.add(B_Paint.paintPolylineGround(cartesian3Arr))
        // const handler = new Cesium.ScreenSpaceEventHandler(this.viewer.canvas)
        this.handler.setInputAction((event) => {
            cartesian3Arr.pop()
            cartesian3Arr.push(this.viewer.scene.globe.pick(this.viewer.camera.getPickRay(event.position), this.viewer.scene))
            this.paintEntities.add(B_Paint.paintPoint(cartesian3Arr.slice(cartesian3Arr.length - 1, cartesian3Arr.length)[0]))
            mouseMove = false
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
        // 若添加了第一个点，画出辅助线
        this.handler.setInputAction((event) => {

            if (cartesian3Arr[0]) {
                if (!mouseMove) {
                    cartesian3Arr.push(this.viewer.scene.globe.pick(this.viewer.camera.getPickRay(event.endPosition), this.viewer.scene))
                    mouseMove = true
                } else {
                    cartesian3Arr.pop()
                    cartesian3Arr.push(this.viewer.scene.globe.pick(this.viewer.camera.getPickRay(event.endPosition), this.viewer.scene))
                }
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
        // 右键
        this.handler.setInputAction(() => {
            document.body.style.cursor = "crosshair"
            cartesian3Arr.pop()
            this._clearHandler()
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)
    }

    paintPolygonTool() {
        Utils.notification("左键开始，右键结束", "primary")
        let mouseMove
        document.body.style.cursor = "crosshair"
        const cartesian3Arr = []
        this.paintEntities.add(B_Paint.paintPolylineGround(cartesian3Arr))
        // const handler = new Cesium.ScreenSpaceEventHandler(this.viewer.canvas)
        this.handler.setInputAction((event) => {
            cartesian3Arr.pop()
            cartesian3Arr.push(this.viewer.scene.globe.pick(this.viewer.camera.getPickRay(event.position), this.viewer.scene))
            this.paintEntities.add(B_Paint.paintPoint(cartesian3Arr.slice(cartesian3Arr.length - 1, cartesian3Arr.length)[0]))
            mouseMove = false
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
        // 若添加了第一个点，画出辅助线
        this.handler.setInputAction((event) => {
            if (cartesian3Arr[0]) {
                if (!mouseMove) {
                    cartesian3Arr.push(this.viewer.scene.globe.pick(this.viewer.camera.getPickRay(event.endPosition), this.viewer.scene))
                    mouseMove = true
                } else {
                    cartesian3Arr.pop()
                    cartesian3Arr.push(this.viewer.scene.globe.pick(this.viewer.camera.getPickRay(event.endPosition), this.viewer.scene))
                }
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
        // 右键
        this.handler.setInputAction(() => {
            this._clearHandler()
            document.body.style.cursor = "default"
            cartesian3Arr.pop()
            this.paintEntities.add(B_Paint.paintPolygon(cartesian3Arr))
            cartesian3Arr.push(cartesian3Arr[0])
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)
    }

    static paintPoint(cartesian3, imgUrl, descriptionPlus) {
        const cartographic = Cesium.Cartographic.fromCartesian(cartesian3)
        let description = `${'<table class="cesium-infoBox-defaultTable"><tbody>' +
            "<tr><th>经度</th><td>"}${cartographic.longitude / Math.PI * 180}</td></tr>` +
            `<tr><th>纬度</th><td>${cartographic.latitude / Math.PI * 180}</td></tr>` +
            `<tr><th>高程</th><td>${cartographic.height}</td></tr>` +
            `</tbody></table>`
        if (descriptionPlus) {
            description = `${'<table class="cesium-infoBox-defaultTable"><tbody>' +
                "<tr><th>经度</th><td>"}${cartographic.longitude / Math.PI * 180}</td></tr>` +
                `<tr><th>纬度</th><td>${cartographic.latitude / Math.PI * 180}</td></tr>` +
                `<tr><th>高程</th><td>${cartographic.height}</td></tr>`
            for (name in descriptionPlus) {
                description += `<tr><th>${name}</th><td>${descriptionPlus[name]}</td></tr>`
            }
            description += `</tbody></table>`
        }
        if (!imgUrl) {
            return new Cesium.Entity({
                name: '点',
                position: cartesian3,
                point: {
                    color: Cesium.Color.fromCssColorString('#D75624'),
                    pixelSize: 8,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                },
                description: description,
            })
        }
        return new Cesium.Entity({
            name: '点',
            position: cartesian3,
            billboard: {
                image: imgUrl,
                width: 30,
                height: 30,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM
            },
            description: description,
        })
    }

    static paintPolyline(cartesian3Arr) {
        let dynamicPositions = new Cesium.CallbackProperty(() => {
            return cartesian3Arr;
        }, false);
        return new Cesium.Entity({
            name: '线', polyline: {
                positions: dynamicPositions,
                width: 2,
                arcType: Cesium.ArcType.NONE,
                material: Cesium.Color.fromCssColorString('#85AB77'), //获取或设置折线的表面外观
            }
        })
    }

    static paintPolylineGround(cartesian3Arr) {
        let dynamicPositions = new Cesium.CallbackProperty(() => {
            return cartesian3Arr;
        }, false);
        return new Cesium.Entity({
            name: '线', polyline: {
                positions: dynamicPositions,
                width: 2,
                arcType: Cesium.ArcType.RHUMB,
                material: Cesium.Color.fromCssColorString('#85AB77'), //获取或设置折线的表面外观
                clampToGround: true
            }
        })
    }

    static paintPolygon(cartesian3Arr) {
        let dynamicPositions = new Cesium.CallbackProperty(() => {
            return new Cesium.PolygonHierarchy(cartesian3Arr);
        }, false);
        return new Cesium.Entity({
            polygon: {
                hierarchy: dynamicPositions,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                material: Cesium.Color.fromCssColorString('#66DA9A').withAlpha(0.5), // classificationType: Cesium.ClassificationType.BOTH // 贴地表和贴模型,如果设置了，这不能使用挤出高度
            }
        })
    };

    addWave(lon, lat, radius, color, duration, count, gradient) {
        // this._viewer.entities.add(addCircleWave(113.49154270736973, 23.155736289067885, 100, {
        //     r: 1,
        //     g: 213,
        //     b: 222,
        //     a: 0.6
        // }, 2e3, 2, 0));
        // this._viewer.entities.add(addCircleWave(102.230282, 29.910397, 2000, {
        //     r: 255,
        //     g: 0,
        //     b: 0,
        //     a: 0.6
        // }, 2e3, 3, 0));
        this.viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(lon, lat - 0.05, 10000),
            orientation: {
                // heading: Cesium.Math.toRadians(309.5),
                pitch: Cesium.Math.toRadians(-55.0),
                roll: 0
            }
        })
        this.viewer.entities.add(addCircleWave(lon, lat, radius, color, duration, count, gradient));
    }
}