function CatalogController($scope, $interval, $http) {
    var plans = [], service, plan, s, p;

    $scope.catalog = {};
    $scope.last_status = "";
    $http.get('http://' + document.location.host + '/v2/catalog').
    success(function(response) {
            for(s = 0; s < response.services.length; s += 1) {
                service = response.services[s];
                for(p = 0; p < service.plans.length; p += 1) {
                    plan = service.plans[p];
                    plans.push({ 'service' : service, 'plan': plan });
                }
            }
            $scope.plans = plans;
            $scope.catalog = response;
    }).
    error(function(data, status, headers, config) {
            $scope.last_status = "" + status + ", " + data;
            console.log("error calling " + config.url + ", " + $scope.last_status);
    });
}
