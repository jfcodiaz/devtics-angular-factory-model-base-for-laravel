/* global BootstrapDialog, laroute */
!function(){
    var devTicsTools = angular.module('devtics-angular-modelbase',[]);
    
    devTicsTools.directive('dtOnlyNumbers', function () {
        return {
            require: 'ngModel',
            link: function (scope, element, attr, ngModelCtrl) {
                function fromUser(text) {
                    if (text) {
                        var transformedInput = text.replace(/[^0-9]/g, '');
                        if (transformedInput !== text) {
                            ngModelCtrl.$setViewValue(transformedInput);
                            ngModelCtrl.$render();
                        }
                        return transformedInput;
                    }
                    return undefined;
                }            
                ngModelCtrl.$parsers.push(fromUser);
            }
        };
    });
    
    devTicsTools.service('dtGeoTools', ['$q', '$window', function ($q, $window) {
        'use strict';
        this.getCurrentPosition = function () {
            var deferred = $q.defer();
            if (!$window.navigator.geolocation) {
                deferred.reject('Geolocation not supported.');
            } else {
                $window.navigator.geolocation.getCurrentPosition(
                    function (position) {
                        deferred.resolve(position);
                    },
                    function (err) {
                        deferred.reject(err);
                    });
            }
            return deferred.promise;
        };
        this.getCurrentPositionGoogleMapLatLng = function () { 
            var deferred = $q.defer();
            this.getCurrentPosition().then(function (position) {
                    var gLatlng = new google.maps.LatLng({
                        lat : position.coords.latitude, 
                        lng : position.coords.longitude
                    });
                    deferred.resolve(gLatlng);
                },
                function (err) {
                            console.log("No se pudo");
                    deferred.reject(err);
                }
            );
            return deferred.promise;
        };
    }]);
    
    devTicsTools.service('dtUploadFiles', function($http, $q) {
        return function (url, files) {
            var $def = $q.defer();
            var fd = new FormData();
            angular.forEach(files,function(file, name) { 
                fd.append(name, file);
            });                
            $http.post(url, fd, {
                transformRequest: angular.identity,
                headers: {'Content-Type': undefined}
            }).then(function(result) {
                $def.resolve(result);
            }, function(result) {
                $def.reject(result);
            });
            return $def.promise;
        };
    });
    devTicsTools.directive("dtFileread", [function () {
        return {
            scope: {
                fileread: "=",
                onselectfile: "="
            },
            link: function (scope, element, attributes) {
                element.bind("change", function (changeEvent) {

                    if(scope.onselectfile){
                        scope.onselectfile(changeEvent,event.target.files);
                    }
                    if(event.target.files[0]){
                        scope.fileread = event.target.files[0];
                    }
                });
            }
        };
    }]);

    devTicsTools.directive('dtFilesDragAndDrop',[
        function (){
            return {
                scope : {
                    fileread: "=",
                    onselectfile: "=",
                    multiple: "="
                },
                link : function(scope, element, attributes){  
                    var inputFile = angular.element(
                        '<input type="file" ' +
                            (attributes.multiple !== undefined ? 'multiple' : '') +
                            (attributes.accept !== undefined ? ' accept="' + attributes.accept + '"' : 'accept=".jpg,.png"') +
                        ' style="display:none">'
                    );
                    element.append(inputFile);
                    inputFile.bind('click', function(e) {
                         e.stopPropagation();
                    });

                    inputFile.bind('change', function(e) {
                        var self = this;
                        scope.$apply(function() {
                            scope.onselectfile(self.files);
                        });
                        e.stopPropagation();
                    });

                    element.bind('click', function ($event) {
                        $(inputFile).click();
                        $event.preventDefault();
                    });

                    element.bind('drop',function($event) {
                        scope.$apply(function() {
                            scope.onselectfile($event.originalEvent.dataTransfer.files);
                        });
                        $event.preventDefault();
                    });

                    element.bind('dragover', function ($event) {
                        $event.preventDefault();
                    });
                }
            };
        }
    ]);
    
    
    devTicsTools.service('dtQtipError', function (){
        return function ($element, text, timeout){
            var _timeout =  timeout? timeout : 2000;
            var qtip = $element.qtip({
                position: { my: 'top left', at: 'Bottom center' },
                style: { classes: 'dt-qtip-error' },
                content: {
                     text: text
                 }
             }).qtip('api');
             qtip.toggle(true);                 
             setTimeout(function() {
                if(qtip && qtip.elements && qtip.elements.tooltip){
                    qtip.elements.tooltip.fadeOut('slow', function(){
                        qtip.destroy(true); 
                    });
                }                
             }, _timeout);
             qtip.disable(true);
        };
    });
    
    
    
    devTicsTools.directive('dtEnter', function ($parse) {
        return function (scope, element, attrs) {
            element.bind("keydown keypress", function (event) {
                if(event.which === 13) {
                    if (!event.shiftKey) {
                        event.preventDefault();
                        var dtEnter = $parse(attrs['dtEnter']);    
                        dtEnter(scope, { $event: event });
                        scope.$apply();   
                    }  
                }
            });
        };
    });
    
    
    devTicsTools.service('SocketIOClientServiceInterce', function() {
        
        this.connect = function () {
            this.socket = io(this.url);
        };
        this.on = function(event, callback){
            console.log("---",event);
            this.socket.on(event, callback);
        };
        
        this.getSocketIO = function(){
            return this.socket;
        };
        
        this.getImplement = function () {
            return this.implement;
        };
        
        this.implementTo = function (obj) {
            this.implement = obj;
            angular.forEach(this, function(value, attr) {
                obj[attr] = value;
            });
        };
         
    });
    
    devTicsTools.directive('dtInputMax', function() {
        return {
            require: 'ngModel',
            scope : {
                dtMax : '=',
                dtOnGtMax : '='
            },
            link : function (scope, element, attrs, ngModelCtrl) {
                 element.bind("keydown keypress", function (event) {
                    if(event.which === 46) {                        
                        event.preventDefault();
                    }
                });
                ngModelCtrl.$parsers.push(function(text) {
                    if(text) {   
                        if(!(/^\d+$/.test(text))) {
                            ngModelCtrl.$setViewValue(text);
                            ngModelCtrl.$render(); 
                            return;
                        }
                        text = Math.floor(parseInt(text, 10));                        
                        if(text>scope.dtMax) { 
                            if(scope.dtOnGtMax) {
                                scope.dtOnGtMax.apply(this,[text, element]);
                            }
                            $(element).notify("Solo se pueden seleccionar hasta " + scope.dtMax);
                            return ;
                        }
                        return text;
                    }
                    ngModelCtrl.$setViewValue("1");
                    ngModelCtrl.$render(); 
                    return 1;
                   
                });
            }
        };
    });
    
    
    devTicsTools.service('dtErrorHelpers', function() {
        var dtErrorHelpers = {};
        dtErrorHelpers.goToElementOnReject = function (promise, jqSelector) {
            promise.catch(function(){
                setTimeout(function(){
                    var $box = $(jqSelector);
                     $('body').scrollTo($box, 500, {  
                        offset: - $(window).height() /2
                    });    
                }, 100);
            });
        };
        return dtErrorHelpers;
    });
    
   devTicsTools.factory('DtDialog', ['$q', '$timeout', '$compile', function($q, $timeout, $compile) {
        var DtDialog = function ($scope) {
        };
        DtDialog.btns = {
            cancel : {
                label : 'Cancelar',
                cssClass : 'btn-danger',
                action : function (dialog) {
                    dialog.close();
                }
            }
        };
        DtDialog.show = function ($scope, $urlTemplate, title, prepare, btn, args) {
            var _btn = btn ? btn : [];
            var $message = $('<div>Cargando...</div>');
            var defer = $q.defer();
            var conf = $.extend({
                title: title[0],
                message: $message,               
                buttons : _btn
            }, args);
            var dialog = BootstrapDialog.show(conf);
            var $footer = dialog.getModalFooter().hide();
            var $btns = $footer.find('.bootstrap-dialog-footer').hide();
            var defPrepare = prepare ? prepare(dialog) : (function(){
                var d = $q.defer();
                $timeout(function(){
                    d.resolve();
                }, 10);     
                return d.promise;
            })();
            var defLoadTemplate = $q.defer();
            $.get($urlTemplate).done(function(txt){
                defLoadTemplate.resolve(txt);
            });
            $q.all([defPrepare, defLoadTemplate.promise]).then(function(results){
                var html = results[1];
                var $divTitle = dialog.getModalHeader().find('.bootstrap-dialog-title');
                $divTitle.fadeOut(300);
                $message.hide(300, function() {
                    var $div = $(this);
                    $div.html(html);       
                    $timeout(function(){
                        dialog.setTitle(title[1]);
                        $divTitle.show("fast");
                        $compile(angular.element($div.closest('.modal-content').get(0)).contents())($scope);
                        defer.resolve(dialog);
                    },1);
                    
                    $div.slideDown("fast");
                    if(_btn.length){ 
                        $footer.show();
                        $btns.show(300);
                    }
                });
            }, function(fail){
                console.log(fail);
            });
            return defer.promise;
        };
        DtDialog.alert = function (args) {
            var $scope = args.$scope;
//            var $template = args.urlTemplate;
            var title = args.title;
            var message = args.txtMessage;
            var okCallbkack = args.callback;
            var dialog = BootstrapDialog.alert({
                title : title,
                type: BootstrapDialog.TYPE_PRIMARY,
                message : message,
                buttonLabel : 'Aceptar',
                callback : function (result) {
                    if(okCallbkack) {
                        return okCallbkack(result, dialog);
                    }
                }
            });
            $footer = dialog.getModalFooter().find('.btn-default').removeClass('btn-default').addClass('btn-primary');
//            var $divMessage = dialog.getModalContent().find('.dt-messge');
//            $divMessage.hide(200, function(){
//                $divMessage.html(message);
//                $compile(angular.element($divMessage.get(0)).contents())($scope);
//                $divMessage.slideDown(200);
//            });
        };
        DtDialog.confirm = function (args) {
            var $scope = args.$scope;
            var $template = args.urlTemplate;
            var title = args.title;
            var message = args.message;
            var yes = args.yes;
            var dialog = BootstrapDialog.confirm({
                title : title,
                message : '<div class="dt-messge">Cargando</div>',
                btnCancelLabel : 'Cancelar',
                btnOkLabel : 'Aceptar',
                callback : function (ok){
                    if(ok){
                        $timeout(function(){
                            yes(dialog);
                        },1);
                    } else {
                        dialog.close();
                    }
                }
            });
            
            var $divMessage = dialog.getModalContent().find('.dt-messge');
            $divMessage.hide(200, function(){
                $divMessage.html(message);
                $compile(angular.element($divMessage.get(0)).contents())($scope);
                $divMessage.slideDown(200);
            });
            
            
        };
        
        DtDialog.tryDo = function(objPromisse, args) {
            if(args===undefined){
                args = {};
            }
            objPromisse.then(function(e) {
                if(args.successConfirm !== false) {
                    var message;
                    if(args.successMessage) {
                        message = args.successMessage;
                    } else if(e && e.data.message){
                        message = e.data.message;
                    } else {
                        message = "Success";
                        console.warn("La respuesta no tiene mensaje");
                    }
                    $('.notifyjs-corner').appendTo("body");
                    var _options = args.notifyOptions ? args.notifyOptions : undefined; 
                    if(args.notifyElement) {
                        $(args.notifyElement).notify(message , "success", _options);
                    }else {
                        $.notify(message , "success", _options);
                    }
                }
            }, function(e){ 
                if(args.failConfirm !== false) {
                    switch(args.failConfirmType) {
                        default :
                            DtDialog.alert({
                                title : 'Error',
                                txtMessage : e.data.message
                            });
                    }
                }
                return e;
            });
            return objPromisse;
        };
        DtDialog.prototype = {
        };
        return DtDialog;
    }]);

    //<editor-fold defaultstate="collapsed" desc="Factory ModelBase">
    devTicsTools.factory('ModelBase', function ($q, $http, $timeout, $interval, $filter) {
        //<editor-fold defaultstate="collapsed" desc="constructor">
        var ModelBase = function (args) {

            this.relations = {};
            this._bk_attrs = {};
            this._FILES = false;
            this.setProperties(args);
            if(this.id){
                this.setReadMode();
            }else {
                this.setCreateMode();
            }
        };
        //</editor-fold>
        //<editor-fold defaultstate="collapsed" desc="Metodos de Instancia (prototype)">
        ModelBase.prototype = {
            setReadMode : function () {
                this.rollback();
                this.setMode(this.model().MODE_READ);
                return this;
            },
            setCreateMode : function () {
                this.setMode(this.model().MODE_CREATE);
                return this;
            },
            setDeleteMode : function () {
                this.setMode(this.model().MODE_DELETE);
                return this;
            },
            cancelUpdate : function () {
                this.rollback();
                this.setReadMode();
            },
            setUpdateMode: function() {
                this._mode = this.model().MODE_UPDATE;
                this.backup();
            },
            inUpdateMode : function () {
                return this._mode === this.model().MODE_UPDATE;
            },
            inReadMode : function () {
                return this._mode === this.model().MODE_READ;  
            },
            inCreateMode : function () {
                return this._mode === this.model().MODE_CREATE;  
            },
            inDeleteMode : function () {
                return this._mode === this.model().MODE_DELETE;  
            },
            getMode : function () {
                return this._mode;
            },
            setMode : function (mode) {
                this._mode = mode;
                return this;
            },
            clearFiles: function() {
                delete this._FILES;
            },
            addFile : function (name, data) {
                if(!this._FILES){
                    this._FILES = {};
                }
                this._FILES[name] = data;
            },
            backup : function() {
                var self = this;
                var attributes = self.model().attributes; 
                angular.forEach(attributes, function(attr){
                    self._bk_attrs[attr] = self[attr];
                });
                return this;
            },
            rollback : function() {
                var self = this;
                angular.forEach(self._bk_attrs, function(i ,attr){
                    self[attr] = self._bk_attrs[attr];
                });
                return this;
            },
            _httpRequest: function (nameMethod, args)  {
                var _args = {};
                var alias = args.alias;
                var urlParams = args.urlParams ? args.urlParams : {};
                var params = args.params ? args.params : {};
                var success = args.success;
                var fail = args.fail;
                var $defer = $q.defer();
                var self = this;
                var build = !(args.build === false);
                var updateProps = !(args.updateProps === false);
                var sendId = !(args.sendId === false);

                if (sendId) {
                    urlParams[this.model().alias] = this.id;
                }

                var url = laroute.route(alias, urlParams);

                if (build && !success) {
                    success = function (result) {
                        if (result.data.collection) {
                            result = self.model().build(result.data.collection);
                        } else if (result.data.model && updateProps) {
                            self.setProperties(result.data.model);
                        }
                        $defer.resolve(result);
                    };
                }

                if (!success) {
                    success = function (result) {
                        $defer.resolve(result);
                    };
                }

                if (!fail) {
                    fail = function (result) {
                        $defer.reject(result);
                    };
                }

                $http[nameMethod](url, params).then(success, fail);

                return $defer.promise;
            },
            httpPut: function (args) {
                return this._httpRequest('put', args);
            },
            httpPost :function (args) {
                return this._httpRequest('post', args);
            },
            httpDelete :function (args) {
                return this._httpRequest('delete', args);
            },
            httpGet :function (args) {
                return this._httpRequest('get', args);
            },
            //<editor-fold defaultstate="collapsed" desc="setProperties">
            setProperties: function (data) {            
                var self = this;
                var atributes = self.model().attributes; 
                var setters = self.model().setters;
                angular.forEach(atributes, function (attr) {
                    if(data[attr] !== undefined) {
                        if(setters && setters[attr]) {
                            self[attr] = setters[attr].apply(self,[data[attr]]);
                            return;
                        }
                        self[attr] = data[attr];                    
                    }
                });
                angular.forEach(self.model().relations,function(r){
                    if(data[r[0]]) {
                        var entity = r[1].build(data[r[0]]);
                        self.relate(r[0], entity);
                    }
                });
            },
            selfUpdateBySocketIO : function () {
                var model = this.model();
                var socket = model.socketIO.SocketIOClientService.getSocketIO();
                var event = model.socketIO.updateEvent;   
                var callback = model.socketIO.callback;   
                var self = this;
                var eventId = event + "_" + this.id;
                console.log("---> " + eventId);
                socket.on(event + "_" + this.id, function(data) {
                    console.log(eventId, data);
                    self.setProperties(data);
                    if(callback) {
                        callback.apply(this, [data]);
                    }
                });
//                    console.log(, laroute.route(model.aliasUrl()));
            },
            selfUpdate : function (milisecons, callback) {  
                console.log("selfUpdate");
                
                var self = this;
                var model = this.model();
                if(model.socketIO){
                    self.selfUpdateBySocketIO();
                    return;
                }
                $interval(function() {
                    self.refresh().then(function(){ 
                        if(callback && callback.apply){
                            callback.apply(self);
                        }
                    });
                },milisecons);            
            },
            refresh : function () {
                var data = {};
                var self = this;
                var $defer =  $q.defer();
                var model = this.model();
                data[model.aliasUrl()] = this.id;
                var url = laroute.route(model.aliasUrl() + '.show', data);            
                $http({
                    'method' : 'GET',
                    'url' : url
                }).then(function(result) {
                    self.setProperties(result.data);
                    $defer.resolve({
                        data : result.data,
                        self : self
                    });
                }, function(r) {                
                    $defer.reject(r);
                });
                return $defer.promise;
            },
            getProperties : function () {
                var self = this;
                var data = {};
                var attributes = self.model().attributes;
                angular.forEach(attributes, function (attr){
                    data[attr] = self[attr];
                });
                return data;
            },
            create : function () {          
                var model = this.model();
                var self = this;
                var url = laroute.route(model.aliasUrl());        
                var $defer = $q.defer();
                var data = this._preparers();
                $http({
                    'method' : 'POST',
                    'data' : data,
                    'url' : url
                }).then(function(result) {
                    self.setProperties(result.data.model);
                    model.model().addCache(self);
                    self.setReadMode();
                    $defer.resolve(result.data);
                },function(r){
                    $defer.reject(r);
                });
                return $defer.promise;
            },
            _preparers : function (data) {
                var self = this;
                var atributes = self.model().attributes; 
                var data = this.getProperties();
                var preparers = self.model().preparers;
                angular.forEach(atributes, function (attr) {
                    if(preparers && preparers[attr]){
                        data[attr] = preparers[attr].apply(self,[self[attr]]);
                        return;
                    }
                    data[attr] = self[attr];
                });
                var relations = this.model().conf_relations;
                angular.forEach(relations, function (conf, relation) {
                    if(conf[ModelBase.RELATIONS.FUNCTION] === "hasMany") {
                        data[relation] = [];
                        angular.forEach(self.relations[relation], function(item){
                            console.log("has Many", item);
                            data[relation].push(item.id ? item.id : item._preparers());
                        });
                    } else if(conf[ModelBase.RELATIONS.FUNCTION] ==='belongsTo') {
                        if(self[relation + '_id']){
                            data[relation + '_id'] = self[relation + '_id'];
                        }
                    } else {
                        console.log("Otra Cosa");
                    }
                });
                return data;
            },
            update : function () {
                var self = this;
                var data = this._preparers();
                var alias= this.model().alias;
                var datalaroute = {};
                datalaroute[alias.replace(/\-/g,'_')] = this.id;
                var url = laroute.route(alias+'.update', datalaroute);
                var $def = $q.defer();
                $http({
                    url : url,
                    method : 'PUT',
                    data : data
                }).then(function(r){
                    self.backup();
                    self.setReadMode();
                    $def.resolve(r.data);  
                },function(r){
                    $def.reject(r);
                });
                return $def.promise;
            },
            saveWithFiles : function () {
                var $def = $q.defer();
                var self = this;
                var fd = new FormData();
                var model = this.model();
                var data = this.getProperties();
                var url = laroute.route(model.aliasUrl()); 
                angular.forEach(this._FILES,function(file, name) { 
                    fd.append(name, file);
                });                
                angular.forEach(data, function (value, field) {
                    if(value!==undefined) {
                        if(angular.isArray(value)){
                            angular.forEach(value,function(item) {
                                fd.append(field+"[]", item);
                            });
                        } else {
                            fd.append(field, value);  
                        }
                    }
                });
                
                var relations = this.model().conf_relations;
                angular.forEach(relations, function (conf, relation) {
                    if(conf[ModelBase.RELATIONS.FUNCTION] === "hasMany") {                        
                        angular.forEach(self.relations[relation], function(item, i) {
                            if(item.id) {
                               fd.append(relation + "[]", item.id);  
                            } else {
                               angular.forEach(item._preparers(), function(value, key) {
                                    if(value !== undefined) {
                                        fd.append(relation + "[" + i + "][" + key + "]", value);   
                                    }
                               });
                            }                    
                        });
                    } else if(conf[ModelBase.RELATIONS.FUNCTION] === 'belongsTo') {
                        fd.append(relation, self[relation + "_id"]);
                    } else if(conf[ModelBase.RELATIONS.FUNCTION] === 'hasOne') {
//                        fd.append(relation, self[relation + "_id"]);
                    }else {
                        console.log("Otra Cosa");
                    }
                });
                $http.post(url, fd, {
                    transformRequest: angular.identity,
                    headers: {'Content-Type': undefined}
                }).then(function(result) {
                    self.setProperties(result.data.model);
                    model.model().addCache(self);
                    self.setReadMode();
                    $def.resolve(result.data);
                }, function() {
                    $def.reject();
               });
               
               return $def.promise;
            },
            save : function () {
                if(this._FILES) {
                    return this.saveWithFiles();
                }
                if(this.id){
                    return this.update();
                }
                return this.create();

            },
            detach : function (strRelation, entity) {
                var fn = this.model().conf_relations[strRelation][ModelBase.RELATIONS.FUNCTION];
                if(fn === "hasMany"){
                    var index = this.relations[strRelation].indexOf(entity);
                    if(index !== -1) {
                        this.relations[strRelation].splice(index,1);
                    }
                    index = this[strRelation + "_ids"].indexOf(entity.id);
                    if(index !==-1) {
                        this[strRelation + "_ids"].splice(index,1);
                    }
                } else if(fn === 'hasOne') {
                    var index = this.relations[strRelation] = undefined; 
                } else {
                    throw Error(strRelation + " Fn no implementada");
                }
                return this;
            },
            relate : function (strRelation, entity) {
                var fn = this.model().conf_relations[strRelation][ModelBase.RELATIONS.FUNCTION];
                if(fn === "hasMany"){
                    if(this.relations[strRelation] === undefined) {
                        this.relations[strRelation] = [];
                        this[strRelation + "_ids"] = [];
                    }
                    var self = this;  
                    if(!angular.isArray(entity)){
                        entity = [entity];
                    }
                    angular.forEach(entity, function(e) {
                        self.relations[strRelation].push(e);
                        self[strRelation + "_ids"].push(e.id);
                    });
                } else if(fn === "belongsTo") {
                    if(entity === null) {
                        this.relations[strRelation] = null;
                        this[strRelation +"_id"] = null;
                    } else {
                        this.relations[strRelation] = entity;
                        this[strRelation +"_id"] = entity.id;
                    }
                } else if(fn == 'hasOne'){
                    if(entity === null){
                        this.relations[strRelation] = null;
                    } else {
                        this.relations[strRelation] = entity;
                    }
                } else {
                    throw Error(strRelation + " Fn no implementada");
                }
                return this;
            },
            remove : function() {
                var model = this.model();
                var url = laroute.route(model.aliasUrl())+"/"+this.id;        
                var $defer = $q.defer();
                var self = this;
                $http({
                    'method' : 'DELETE',
                    'url' : url
                }).then(function(result) {
                    //Todo implemenetar elminar de cache
                    $defer.resolve(result);
                    self.setDeleteMode();
                },function(r){
                    $defer.reject(r);
                });
                return $defer.promise;
            },
            getRelation : function (relation){
                return this.relations[relation];
            },
            hasOne : function (Model, key, args) {
                var self = this;
                var defer = $q.defer();
                if(self.id){
                    var data = {
                        'id' : self.id,
                        'relation' :  key
                    };
                     if(args && args.with) {
                        data.with = args.with;
                    }  
                    var url = laroute.route(self.model().aliasUrl()  + '.relation', data);
                    $http({
                        'method' : 'GET',
                        'url' : url
                    }).then(function(result){                
                        var instancia = Model.build(result.data);
                        self.relations[key] = instancia;
//                        self[key+"_ids"] = arrIds;
                        defer .resolve(instancia);                                
                    },function(r) {                
                        defer .reject(r);
                    });
                } else {
                    throw new Error("El modelo no ha sido guardado, no se pueden sersolver relaciones a otros objetos");
                }
                return defer.promise;
            },
            hasMany : function (Model, key, args) {
                var self = this;
                var defer = $q.defer();
                if(self.id){
                    var data = {
                        'id' : self.id,
                        'relation' :  key
                    };
                    if(args && args.with) {
                        data.with = args.with;
                    }  
                    var url = laroute.route(self.model().aliasUrl()  + '.relation', data);
                    $http({
                        'method' : 'GET',
                        'url' : url
                    }).then(function(result){                
                        var arrIds = [];
                        var instancias = Model.build(result.data, function(obj){
                            arrIds.push(obj.id);
                        });
                        self.relations[key] = instancias;
                        self[key+"_ids"] = arrIds;
                        defer .resolve(instancias);                                
                    },function(r) {                
                        defer .reject(r);
                    });
                } else {
                    $timeout(function(){
                        defer .resolve([]);
                    });
                }
                return defer.promise;
            },
            belongsTo : function (Model, key, field, args) {
                var self = this;
                var defer = $q.defer();
                var id = this[field ? field : key + "_id"];
                if(id) {
                    Model.getById(id,args).then(function(entidad) {                                  
                        self.relations[key] = entidad;                         
                        defer.resolve(entidad);
                    }, function(r){
                        defer.reject(r);
                    });
                } else {
                    $timeout(function() {
                        defer.resolve(null);
                    }, 10);
                }

                return defer.promise;
            }
            //</editor-fold>
        };
        //</editor-fold>
        //<editor-fold defaultstate="collapsed" desc="Metodos Estaticos">
        ModelBase.findCache = function(obj){        
            var cache = this.model().cache;                       
            obj = cache[obj.id];
            if(obj){
                return obj;
            } else {
                return false;
            }
        };
        ModelBase.setInt = function (value) {
            if(value) {
                return parseInt(value, 10);
            }
            return 0;
        },
        ModelBase.setFloat = function (value) {
            if(value){
                return parseFloat(value);
            }
            return undefined;
        },
        //Helper para setear fechas 

        ModelBase.setDate = function (value) {
            if(angular.isString(value)) {
                var date = new Date(value);
                if(isNaN(date.getTime())){
                    return null;
                }
                return date;
            }
            return value;
        };
        ModelBase.prepareDateTime = function (date){
            var dateTemp = new Date(date);
            if(dateTemp.getTime && !isNaN(dateTemp.getTime())){
                return $filter('date')(dateTemp,'yyyy-MM-dd HH:mm:ss Z');;
            } else {
                return undefined;
            }
        };
        ModelBase.prepareDate = function (date){
            var dateTemp = new Date(date);
            dateTemp.setHours(0);
            dateTemp.setMinutes(0);
            dateTemp.setSeconds(0);
            if(dateTemp.getTime && !isNaN(dateTemp.getTime())){
                return $filter('date')(dateTemp,'yyyy-MM-dd HH:mm:ss Z');;
            } else {
                return undefined;
            }
        };
        ModelBase.model = function () {
            return this.prototype.model();
        };
        ModelBase.getCache = function () {
            return this.cache;
        };    
        ModelBase.MODE_CREATE = 1;
        ModelBase.MODE_READ = 2;
        ModelBase.MODE_UPDATE = 3;
        ModelBase.MODE_DELETE = 4;
        ModelBase.RELATIONS = {
            KEY : 0,
            MODEL : 1,
            FUNCTION : 2,
            FIELD: 3
        };
        
        ModelBase.addCircularDependency = function(key, fnModel, fn, field){
            var model = this.model();
            var v = [key, fnModel, fn, field];
            model.relations.push(v);
            model.addRelation(key, fnModel, fn, field);
            model.conf_relations[key] = v;
        };
        
        ModelBase.addRelation = function (key, fnModel, fn, field) {
            var model = this.model();        
            if(angular.isString(fn)){//funciones de relaciones por defecto                
                switch(fn){
                    case 'belongsTo' :
                        fn = function (args) {                               
                            return this.belongsTo(fnModel, key, field, args);
                        };
                        model.attributes.push(field ? field : key + "_id");
                        break;
                    case 'hasMany' : 
                        fn = function (args) {                              
                            return this.hasMany(fnModel, key, args);
                        };
                    case  'hasOne' : 
                        fn = function (args){
                            return this.hasOne(fnModel, key, args);
                        };
                    break;
                }                
            } 
            model.prototype[key] = fn;
        };

        ModelBase.createModel = function (model, statics, prototype) {
            angular.extend(model.prototype, ModelBase.prototype, prototype);
            angular.extend(model, ModelBase, statics);
            model.prototype.model = function () {            
                return model;
            };
            model.cache = [];
            model.conf_relations = {};
            angular.forEach(model.relations, function(v){            
                var key = v[ModelBase.RELATIONS.KEY];            
                var fn = v[ModelBase.RELATIONS.FUNCTION];
                var fnModel = v[ModelBase.RELATIONS.MODEL];
                var field = v[ModelBase.RELATIONS.FIELD];
                model.addRelation(key, fnModel, fn, field);
                model.conf_relations[key] = v;
            });
            return model;
        };
        ModelBase.aliasUrl = function () {
            return this.alias;
        };
        ModelBase.addCache = function(obj) {        
            var Model = this.model();        
            var cache = Model.getCache();
            cache[obj.id] = obj;        
            return obj;
        };
        //<editor-fold defaultstate="collapsed" desc="build">
        ModelBase.build = function (data, fnSteep) {        
            if(fnSteep === undefined) {
                fnSteep = $.noop;
            }
            var Model = this.model(), obj;
            if (angular.isArray(data)) {            
                var arrInst = [];
                var i = 0;
                angular.forEach(data, function (d) {                
                    obj = Model.findCache(d);                                
                    if(obj) {
                        obj.setProperties(d);
                        arrInst.push(obj);
                        i++;
                    } else {
                        obj = Model.addCache(new Model(d));  
                        arrInst.push(obj);
                    }
                    fnSteep(obj);
                });
                return arrInst;
            }
            obj = Model.findCache(data);
            if(!obj) {                   
                obj = Model.addCache(new Model(data));
            }
            fnSteep(obj);
            return obj;
        };
        //</editor-fold>
        //<editor-fold defaultstate="collapsed" desc="getAll">
        ModelBase.getAll = function () {
            var self = this.model();
            var url = laroute.route(this.aliasUrl());        
            var $defer = $q.defer();
            $http({
                'method' : 'GET',
                'params' : {
                    'paginacion' : false
                },
                'url' : url
            }).then(function(result) {
                var instancias =self.model().build(result.data);
                $defer.resolve(instancias);
            },function(r){
                $defer.reject(r);
            });
            return $defer.promise;
        };
        //</editor-fold>
        //<editor-fold defaultstate="collapsed" desc="paginado">
        ModelBase.paginado = function () {            
            var self = this;        
            var url = laroute.route(this.aliasUrl());
            var $defer = $q.defer();        
            $http({
                'method' : 'GET',
                'params' : { 
                    'paginacion' : true
                },
                'url' : url
            }).then(function(result) {
                var arrInst = [], pojsos, paginacion;            
                    pojsos = result.data.data;
//                    paginacion = new Paginacion.build(result.data, self.model());
                $defer.resolve({
                    'instancias': arrInst,
                    'paginacion' : paginacion
                });
            });
            return $defer.promise;
        };
        //</editor-fold>
        //<editor-fold defaultstate="collapsed" desc="getURLForAllDataTables">
        ModelBase.getURLForAllDataTables = function () {
            var self = this;
            var url = laroute.route(self.model().aliasUrl()  + '.all-for-datatables', {});
            return url;
        };
        //</editor-fold>
        //<editor-fold defaultstate="collapsed" desc="getallForDataTables">
        ModelBase.getAllForDataTables = function() {
            var self = this;
            var url = self.getURLForAllDataTables();
            var $defer = $q.defer();
            $http({
                'method' : 'GET',
                'url' : url
            }).then(function(result) {
                $defer.resolve(result.data);
            });
            return $defer.promise;
        };
        //</editor-fold>
        //<editor-fold defaultstate="collapsed" desc="getById">
        ModelBase.getById = function(id, args) {        
            var data = angular.extend(args || {} , {
                id : id
            });
            var self = this; 
            var $defer = $q.defer();                
            var objCache = self.model().findCache(data);     
            if(objCache !== false) {
                $timeout(function() {
                    $defer.resolve(objCache);
                }, 10);
            } else {   
                data = {};
                if(args) {
                    data.with = args.with;
                }
                data[this.aliasUrl()] = id;
                var url = laroute.route(this.aliasUrl() + '.show', data);   
                $http({
                    'method' : 'GET',
                    'url' : url
                }).then(function(result) {
                    var instancias = self.model().build(result.data);
                    $defer.resolve(instancias);
                }, function(r) {                
                    $defer.reject(r);
                });
            }
            return $defer.promise;
        };
        //</editor-fold>
        //</editor-fold>
        return ModelBase;
    });
    //</editor-fold>
    
}();
