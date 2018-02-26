(function(){
    var requestAnimFrame = window.requestAnimationFrame       ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame;

    var cancelAnimationFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame;

    var random = function (start, end) {
        return start + ~~(Math.random() * (end - start));
    };

    var closeArr = [];
    var DanmuSystem = function ($target, options) {
        this.$container = $target;
        this.options = options || {};
        this.data = this.options.data;
        this.rowHeight = this.options.rowHeight || 50;
        this.wordSpace = this.options.wordSpace || 50;
        this.rowNum = this.options.rowNum;
        this.topOffset = this.options.offsetTop || 40;
        this.addCloseBtn = this.options.addCloseBtn;
        this.addMask = this.options.addMask;
        this.destroyContainer = this.options.destroyContainer;
        this.winWidth = this.$container.getRect().width || 800;
        this.winHeight = this.$container.getRect().height || 600;
        this.offTime = this.options.offTime || 60 * 1000;
        this.addCookie = this.options.addCookie;
        this.link = this.options.link || '###';
        this.allMotion = [];
        this.rowData = [];
        this.count = 0;
        this.hoverRow = null;  // 用来标记hover暂停的行号
        this.status = {
            countDownOn: false
        };
        this.init();
        this.listen();
        this.bindEvent();
    }
    DanmuSystem.prototype = {
        init: function() {
            var self = this;
            this.renderDanmuDom();
            setTimeout(function() {
                self.setRowData();
                self.rowAnimate();
                self.renderWord();
            }, 500);
        },
        listen: function () {
            var self = this;

            /**
             * 监听倒计时，当弹幕有至少三行 left < 0时候开启倒计时
             */ 
            // qboot.events.on('motion:off', function () {
            //     if (!self.status.countDownOn) {
            //         self.status.countDownOn = true;
            //         self.countDownStart();
            //     }  
            // });
        },
        bindEvent: function(){  
            var self = this,
                visProp = this.getHiddenProp(),
                $doc = W(document);

            /**
             * 鼠标移入暂停运动
             */ 
            this.$danmu.delegate('.row', 'mouseenter', function() {
                var row = W(this).getAttr('data-row');
                self.hoverRow = row;
                self.pauseMotion(row);
            });

             /**
             * 鼠标移除继续运动
             */ 
            this.$danmu.delegate('.row', 'mouseleave', function() {
                if (!self.hoverRow) {
                    return;
                }
                self.hoverRow = null;
                var row = W(this).getAttr('data-row');
                self.resumeMotion(row);
            });

            /**
             * 点击弹幕
             */ 
            this.$danmu.delegate('.row a', 'click', function () {
                // qboot.events.fire('danmu:click');
                if (!self.hoverRow) {
                    return;
                }
                self.hoverRow = null;
                var row = W(this).getAttr('data-row');
                self.resumeMotion(row);  
            });

            /**
             * 关闭弹幕
             */ 
            this.$container.delegate('.danmu-close', 'click', function () {
                // qboot.events.fire('danmu:close');
                self.addCookie && self.setCloseCookie();
                self.offTimer && clearInterval(self.offTimer);
                self.destroy();
            });

            this.$container.delegate('.danmu-close', 'mouseenter', function () {
                self.$danmu.addClass('danmu-close-hover');
            });


            this.$container.delegate('.danmu-close', 'mouseleave', function () {
                self.$danmu.removeClass('danmu-close-hover');
            });

            if (!visProp) {
                return;
            }
            var evtname = visProp.replace(/[H|h]idden/, '') + 'visibilitychange';
            $doc.on(evtname, function () {
                if (document.visibilityState === 'hidden') {
                    self.offTimer && clearInterval(self.offTimer);
                    self.pauseAllMotion();  
                    return;
                } 
                self.resumeAllMotion();  
                self.status.countDownOn && self.countDownStart();
            });
        },
        setCloseCookie: function () {
            new AppData('api.hao.360.cn').set('danmu_noshow', 1);
        },
        countDownStart: function () {
            var self = this,
                time = this.offTime;
            if (time <= 1) {
                self.countDownEnd();
                return;
            }   
            this.$countDown.html('剩余'+ time +'秒').show();
            this.offTimer = setInterval(function () {
                if (time <= 1) {
                    self.countDownEnd();
                    return;
                }
                self.$countDown && self.$countDown.html('还剩'+ -- time +'秒');
                self.offTime = time;
            }, 1000);
        },
        countDownEnd: function () {
            clearInterval(this.offTimer);
            this.$countDown && this.$countDown.fadeOut(1200);
            this.destroy();
        },
        renderDanmuDom: function () {
            var self = this,
                rowHtml = '',
                html = '',
                close = this.addCloseBtn ? '<div class="close"><div class="count-down"></div><div class="danmu-close"><img src="http://p7.qhimg.com/t015aebea1e2ccfb294.png"></div></div>' : '',
                mask = this.addMask ? '<div class="mask"></div>' : '';

            for (var i = 0; i < this.rowNum; i++) {
                rowHtml += '<div class="row"></div>';
            }
                
            html = '<div id="danmu">' + close + mask + rowHtml + '</div>'
            W(html).appendTo(this.$container);
            this.$danmu = this.$container.query('#danmu');
            this.$countDown = this.$container.query('.count-down');
            this.$closeBtn = this.$container.query('.danmu-close');
            this.setDanmuDomStyle();
        },
        setDanmuDomStyle: function () {
            var self = this,
                $rowEls = this.$danmu.query('.row');
            $rowEls.forEach(function (el, index) {
                W(el).addClass('row' + index).setAttr('data-row', index).css({
                    height: self.rowHeight + 'px',
                    top: index * self.rowHeight + 10 + 'px',
                    left: self.winWidth + 'px'
                });
            });
        },
        setRowData : function(){
            for(var i = 0; i < this.rowNum; i++){
                this.rowData[i] = {
                    items : [],
                    step : random(3, 5),
                    top : this.topOffset + i * this.rowHeight
                };
            }
        },
        renderWord: function() {
            var self = this;
            this.renderTimer = setInterval(function() {
                self.insertWord();
            }, 200, true);
        },
        getWordData: function () {
            var d = this.data.shift();
            this.data.push(d);
            return d;
        },
        getWorNode: function (data, msg) {
            var html = '<a href="'+ this.link +'" target="_blank" data-row="' + data.row + '">' 
                        + msg.text 
                    + '</a>',
                $node = W(html).css({
                    color: '#' + ('00000' + (Math.random() * 0x1000000<<0).toString(16)).slice(-6),
                    fontSize: random(24, 32) + 'px'
                });
            return $node;
        },
        insertWord : function(){
            var msg = this.getWordData(),
                data = this.getRowData();

            if (!data) {
                return;
            }

            var $wordNode = this.getWorNode(data, msg),
                $word = $wordNode.appendTo(this.$danmu.query('.row' + data.row)),
                $last = this.$danmu.query('.row a').last();

            //push到所属数据列表中
            this.rowData[data.row].items.push({
                $el : $word
            });
        },
        rowAnimate: function() {
            var self = this,
                $rowEls = this.$danmu.query('.row'),
                count = 0;
            var motionTimer = setInterval(function () {
                
                if (count >= $rowEls.length) {
                    clearInterval(motionTimer);
                    return;
                }
                self._ani($rowEls.item(count), count);
                count ++;
                if (count === 1) {
                    self.$closeBtn.show();
                }
            }, 200);
        },
        _ani: function ($row, index) {
            var self = this,
                data = this.getRowData();

            $row.animate({
                left: {
                    to: data.left + 'px'
                },
                opacity: {
                    to: 1
                }
            }, 300, function () {
                 //创建一个运动实例
                 var motion = new Motion({
                    obj: $row,
                    x1: data.left,
                    row: index,
                    step: self.rowData[index].step,
                    func: function() {
                        // self.removeMotion(this.id);
                    }
                });

                //加入运动实例数组
                self.allMotion.push(motion);
            }, QW.Easing.easeBoth);
        },
        getRowData : function () {
            var row = 0, 
                left = 0, 
                width = this.winWidth, 
                minX = 999999;

            for(var i = 0, len = this.rowData.length; i < len; i++) {
                if (this.rowData[i].items.length == 0) {
                    row = i;
                    left = Math.round(width / 5 * 4);
                    break;
                } else if (this.hoverRow != i){
                    var items = this.rowData[i].items,
                        $el = items[items.length - 1].$el,
                        _left = $el.getRect().left + $el.getRect().width + this.wordSpace;
                    if (_left < minX) {
                        row = i;
                        left = _left;
                        minX = _left;
                    }
                }
            }
            if (this.rowData.length > 0 && left <= width) {
                return {
                    row : row,
                    left : left
                };
            } else {
                return false;
            }
        },
        resumeMotion: function(row) {
            this.allMotion.forEach(function (el) {
                if(el && row == el.row){
                    el.resume(row);
                }
            });
        },
        pauseMotion: function(row) {
            this.allMotion.forEach(function (el) {
                if(el && row == el.row){
                    el.pause();
                }
            });
        },
        pauseAllMotion: function () {
            this.allMotion.forEach(function (el) {
                el.pause();
            });
        },
        resumeAllMotion: function () {
            this.allMotion.forEach(function (el) {
                el.resume();
            });
        },
        destroy: function () {
            var self = this,
                visProp = this.getHiddenProp();
            this.renderTimer && clearInterval(this.renderTimer);
            this.$container.fadeOut(1200, function () {
                //停止所有运动
                self.allMotion.forEach(function (motion) {
                    motion.destroy();
                });
                //移除所有子元素
                self.$container.empty();
                self.destroyContainer && self.$container.removeNode();
            });
            if (visProp) {
                var evtname = visProp.replace(/[H|h]idden/, '') + 'visibilitychange';
                W(document).un(evtname);
            }
        },
        getHiddenProp: function () {
            var prefixes = ['webkit','moz','ms','o'];
            if ('hidden' in document) return 'hidden';
            for (var i = 0; i < prefixes.length; i++) {
                if ((prefixes[i] + 'Hidden') in document) 
                    return prefixes[i] + 'Hidden';
            }
            return null;
        }
    };

    // 动画类
    var Motion = function (options) {
        this.init(options);
        this.play();
    };
    Motion.prototype = {
        init: function (options) {
            // qboot.createEvents(this);
            this.obj = options.obj;
            this.x1 = options.x1;
            this.step = options.step;
            this.row = options.row;
            this.requestAnimationFrameId = null;
            this.func = options.func || function () {};
            this.status = {
                off: false,
                pause: false,
                stop: false
            };
        },
        play: function () {
            if (this.status.stop || this.status.pause) {
                return;
            }

            var self = this,
                w = 0,
                l = parseInt(this.x1 - this.step),
                $item0 = this.obj.query('a').first();
            
            /**
             *  如果运动实例移除弹幕区域，则直接移出并停止运动，执行回调
             */
            
            if ($item0) {
                w = $item0.getRect().width;
                if (l <= -w) {
                    $item0.removeNode();
                    l += w;
                }
            }

            this.setPosition(l);
            this.timingOff(l);
            this.x1 = l;

            /**
             *  如果是暂停或者停止状态
             */
            if (this.verifyStatus()) {
                if (requestAnimFrame) {
                    this.requestAnimationFrameId = requestAnimFrame(this.play.bind(this));
                    return;
                }

                setTimeout(function () {
                    self.play();
                }, 80); 
            }  
        },
        timingOff: function (l) {
            if (l > 0 || this.status.off) {
                return;
            }
            closeArr.push(this.row);
            this.status.off = true;
            // if (closeArr.length > 2) {
            //     qboot.events.fire('motion:off');
            // }
        },
        pause: function () {
            this.status.pause = true;
            this.requestAnimationFrameId && cancelAnimationFrame(this.requestAnimationFrameId);
        },
        resume: function () {
            this.status.pause = false;
            this.play();
        },
        stop: function () {
            this.status.stop = true;
        },
        destroy: function () {
            this.stop();
            this.obj = null;
        },
        setPosition: function (l) {
            this.obj.css({
                left: l + 'px'
            });
        },
        verifyStatus: function () {
            return !this.status.pause && !this.status.stop;
        }
    };
    window.DanmuSystem = DanmuSystem;
}());

