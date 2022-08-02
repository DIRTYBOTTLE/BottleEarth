import * as Cesium from "cesium/Cesium";
import Utils from "@/scripts/Utils";

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


}