!function(){
    var devTicsTools = angular.module('devtics-angular-modelbase',[]);
    
    devTicsTools.service('SocketIOClientServiceInterce', function() {
        
        this.connect = function () {
            this.socket = io(this.url);
        };
        this.on = function(event, callback){
            console.log("---",event);
            this.socket.on(event, callback);
        }
        
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
        }
        
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
        DtDialog.prototype = {
        };
        return DtDialog;
    }]);

    
    
    
    
    //<editor-fold defaultstate="collapsed" desc="Factory ModelBase">
    devTicsTools.factory('ModelBase', function (Paginacion, $q, $http, $timeout, $interval, $filter) {
        //<editor-fold defaultstate="collapsed" desc="constructor">
        var ModelBase = function (args) {

            this.relations = {};
            this._bk_attrs = {};
            this._FILES = false;
            this.setProperties(args);
        };
        //</editor-fold>
        //<editor-fold defaultstate="collapsed" desc="Metodos de Instancia (prototype)">
        ModelBase.prototype = {
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
            //<editor-fold defaultstate="collapsed" desc="setProperties">
            setProperties: function (data) {            
                var self = this;
                var atributes = self.model().attributes; 
                var setters = self.model().setters;
                angular.forEach(atributes, function (attr) {
                    if(setters && setters[attr]){
                        self[attr] = setters[attr].apply(self,[data[attr]]);
                        return;
                    }
                    self[attr] = data[attr];
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
                    instancias =model.model().addCache(self);
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
                        angular.forEach(self[relation + "_ids"], function(item){
                            data[relation].push(item);
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
                datalaroute[alias] = this.id;
                var url = laroute.route(alias+'.update', datalaroute);
                var $def = $q.defer();
                $http({
                    url : url,
                    method : 'PUT',
                    data : data
                }).then(function(r){
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
                        angular.forEach(self[relation + "_ids"], function(item) {                            
                            fd.append(relation + "[]", item);                            
                        });
                    } else if(conf[ModelBase.RELATIONS.FUNCTION] === 'belongsTo') {
                        fd.append(relation, self[relation + "_id"]);
                    } else {
                        console.log("Otra Cosa");
                    }
                });
                $http.post(url, fd, {
                    transformRequest: angular.identity,
                    headers: {'Content-Type': undefined}
                }).then(function() {
                    $def.resolve();
                }, function() {
                    $def.reject() 
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
                    if(index != -1) {
                        this.relations[strRelation].splice(index,1);
                    }
                    index = this[strRelation + "_ids"].indexOf(entity.id);
                    if(index !=-1) {
                        this[strRelation + "_ids"].splice(index,1);
                    }
                }else {
                    throw Error(strRelation + " Fn no implementada");
                }
                return this;
            },
            relate : function (strRelation, entity) {
                var fn = this.model().conf_relations[strRelation][ModelBase.RELATIONS.FUNCTION];
                if(fn === "hasMany"){
                    if(this.relations[strRelation]==undefined) {
                        this.relations[strRelation] = [];
                        this[strRelation + "_ids"] = [];
                    }
                    this.relations[strRelation].push(entity);
                    this[strRelation + "_ids"].push(entity.id);
                } else if(fn === "belongsTo") {
                    if(entity == null) {
                        this.relations[strRelation] = null;
                        this[strRelation +"_id"] = null;
                    } else {
                        this.relations[strRelation] = entity;
                        this[strRelation +"_id"] = entity.id;
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
                $http({
                    'method' : 'DELETE',
                    'url' : url
                }).then(function(result) {
                    //Todo implemenetar elminar de cache
                    $defer.resolve(result);
                },function(r){
                    $defer.reject(r);
                });
                return $defer.promise;
            },
            getRelation : function (relation){
                return this.relations[relation];
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
                        data.with = args.with
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
        ModelBase.RELATIONS = {
            KEY : 0,
            MODEL : 1,
            FUNCTION : 2,
            FIELD: 3
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
    //        console.log("models->"+model.attributes);
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
                    paginacion = new Paginacion.build(result.data, self.model());
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
                    data.with = args.with
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