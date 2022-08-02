import * as Cesium from "cesium/Cesium";

export class B_DataSource {
    constructor(viewer) {
        this.viewer = viewer
        // this.viewer.scene.globe.depthTestAgainstTerrain = true;
    }

    loadGeoJSON = (data) => {
        const url = (data.url || "/geoserver/water/ows")
        const category = (data.category) ? (data.category + ':') : ""
        const name = data.name
        const icon = data.icon
        const count = (data.count) ? ("&count=" + data.count) : ""
        const bbox = (data.bbox) ? ("&bbox=" + data.bbox) : ""
        Cesium.GeoJsonDataSource.load(
            url + "?service=WFS&version=2.0.2&request=GetFeature" +
            "&typeName=" + category + name + count + bbox +
            "&outputFormat=application/json", {
                clampToGround: true
            })
            .then((dataSource) => {
                dataSource.name = name
                const entities = dataSource.entities.values
                for (let i = 0; i < entities.length; i++) {
                    const entity = entities[i];

                    if (entity.billboard) {
                        entity.billboard = new Cesium.BillboardGraphics({
                            image: icon,
                            width: 30,
                            height: 30,
                            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                            verticalOrigin: Cesium.VerticalOrigin.BOTTOM
                        })
                    }
                    // if (entity.polyline) {
                    //     entity.polyline.clampToGround = true
                    // }
                    if (entity.polygon) {
                        // let dynamicPositions = new Cesium.CallbackProperty(() => {
                        //     return new Cesium.PolygonHierarchy(entity.polygon.hierarchy);
                        // }, false);
                        // console.log(entity.polygon.hierarchy._value.positions)
                        // this._drawPolygon(entity.polygon.hierarchy._value.positions)
                        // console.log(entity.polygon.hierarchy)
                        // this.viewer.entities.add(new Cesium.Entity({
                        //     polygon: {
                        //         // hierarchy: dynamicPositions,
                        //         // height : 0,
                        //         hierarchy: entity.polygon.hierarchy,
                        //         heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                        //         material: Cesium.Color.fromCssColorString('#66DA9A').withAlpha(0.5), // classificationType: Cesium.ClassificationType.BOTH // 贴地表和贴模型,如果设置了，这不能使用挤出高度
                        //     }
                        // }))
                        // return
                        // entity.polygon = new Cesium.PolygonGraphics({
                        //     hierarchy: entity.polygon.hierarchy,
                        //     heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
                        //     material: Cesium.Color.fromCssColorString('#66DA9A').withAlpha(0.5),
                        // })
                        // console.log(entity.polygon)
                        // entity.polygon.heightReference = Cesium.HeightReference.RELATIVE_TO_GROUND;  // 贴地
                        // entity.polygon.height = 0;  // 距地高度0米
                        // console.log(entity.polygon.heightReference)
                        // entity.polygon.heightReference = Cesium.HeightReference.CLAMP_TO_GROUND
                        // console.log(entity.polygon.heightReference)

                        // console.log(entity.polygon.heightReference)
                    }
                    // console.log(entity)
                }
                // console.log(entities)
                // console.log(Cesium.HeightReference.CLAMP_TO_GROUND)
                this.viewer.dataSources.add(dataSource);
            })
            .catch(function (error) {
                window.alert(error);
            });
    }

    _drawPolygon(positions) {
        let dynamicPositions = new Cesium.CallbackProperty(() => {
            return new Cesium.PolygonHierarchy(positions);
        }, false);
        this.viewer.entities.add(new Cesium.Entity({
            polygon: {
                hierarchy: dynamicPositions,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                material: Cesium.Color.fromCssColorString('#66DA9A').withAlpha(0.5), // classificationType: Cesium.ClassificationType.BOTH // 贴地表和贴模型,如果设置了，这不能使用挤出高度
            }
        }));
    };
}