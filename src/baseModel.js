!function(){
    var devTics = angular.module('devtics-angular-model-base',[]);
    devTics.factory('ModelBaseT1',function(){
        var ModelBaseT1 = function () {
            this.msj="Modelo Base";
        };
        return ModelBaseT1;
    });
}();