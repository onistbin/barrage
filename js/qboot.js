(function(){
    qboot = {
        mix: function(des, src, map){
            map = map || function(d, s, i){
                //这里要加一个des[i]，是因为要照顾一些不可枚举的属性
                if(!(des[i] || (i in des))){
                    return s;
                }
                return d;
            }
            if(map === true){	//override
                map = function(d,s){
                    return s;
                }
            }

            for (var i in src) {
                des[i] = map(des[i], src[i], i, des, src);
                if(des[i] === undefined) delete des[i];	//如果返回undefined，尝试删掉这个属性
            }
            return des;
        },
        /**
         * 简版的自定义事件
         */
        createEvents: function(obj){
            var events = {}, mix = qboot.mix;

            mix(obj, {
                on: function(evtType, handler){
                    events[evtType] = events[evtType] || [];
                    events[evtType].push(handler);
                },
                fire: function(evtType, args){
                    args = args || {};
                    mix(args, {
                        type: evtType,
                        target: obj,
                        preventDefault: function(){
                            args.returnValue = false;
                        }
                    });
                    var handlers = events[evtType] || [];
                    for(var i = 0; i < handlers.length; i++){
                        handlers[i](args);
                    }
                    return args.returnValue !== false
                }
            });

            return obj;
        }
    };
    window.qboot = qboot;
})();
