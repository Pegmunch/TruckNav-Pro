import CarPlay
import MapKit

@available(iOS 12.0, *)
class CarPlayDelegate: NSObject, CPTemplateApplicationDelegate {
    var interfaceController: CPInterfaceController?
    var mapViewController: CPMapTemplateDelegate?

    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didConnect interfaceController: CPInterfaceController,
        to window: UIWindow
    ) {
        self.interfaceController = interfaceController
        let rootTemplate = self.createRootTemplate()
        interfaceController.setRootTemplate(rootTemplate, animated: false)
    }

    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didDisconnect interfaceController: CPInterfaceController,
        from window: UIWindow
    ) {
        self.interfaceController = nil
        self.mapViewController = nil
    }

    private func createRootTemplate() -> CPTemplate {
        let section = CPListSection(items: [
            CPListItem(text: "Navigate", accessoryType: .disclosureIndicator)
        ])
        
        let listTemplate = CPListTemplate(title: "TruckNav Pro", sections: [section])
        return listTemplate
    }
}
