/**
 * page.js
 * 新设计的路由类，实现类似后端MVC的原理，实现路由和页面控制类的直接映射规则，从而使路由控制与页面解耦
 * 约定：
 * 1、hash规则 #!/{pageName}?param1=XXX!!param2=YYY
 * 2、页面定义采用语义标签，section#pagename > header + div.content + footer
 * 3、将页面控制类放到/js/page/{pagename}.js
 * 4、页面对应的模版放在/tpl/page/{pagename}.tpl
 *
 * 实现原理如下：
 * 1、监听window.onhashchange事件，
 * 2、根据e.oldURL中oldPageName找到oldPage控制类，调用oldPage.hide()，该方法将隐藏dom中id为oldPageName的元素
 * 3、根据e.newURL中newPageName找到newPage控制类，调用newPage.show()（如果dom还没有newPageName元素，则获取模版渲染后插入dom）
 *
 * 浏览器兼容：
 * page.js为移动端浏览器设计，兼容Chrome>=5.0, IE>=9.0
 /*jshint bitwise: false */
'use strict';
var running = false,
    showDefaultPage, lastPage;
/**
 * 启动路由
 * @param  {string} defaultPage 默认页面
 * @return {null}
 */
exports.start = function (defaultPage) {
    if (!running) {
        window.addEventListener('hashchange', onhashchange, false);
        document.addEventListener('click', onclick, false);

        running = true;
        if ((typeof defaultPage) === 'string') {
            showDefaultPage = function () {
                //changePage(defaultPage);
                location.replace('#!/' + defaultPage);
            };
        }
        onhashchange({
            newURL: window.location.href
        });
    }
};


function onclick(e) {
    var target = closest(e.target, 'a');
    if (target) {
        var newUrl = target.getAttribute('href'),
            oldPage = getPage(window.location.href),
            newPage = getPage(newUrl);
        //对于hashbang中同一个页面，多次a链接跳转只产生一条历史记录
        if (oldPage === newPage) {
            e.preventDefault();
            e.stopPropagation();
            window.location.replace(newUrl);
        }
    }
}
/**
 * 获得从指定节点开始，向祖先节点找到的指定名称的节点
 * @param  {[type]} node [description]
 * @return {[type]}      [description]
 */
function closest(node, nodeName) {
    while (node && node.nodeName.toLowerCase() != nodeName) {
        if (isDocument(node))
            return null;
        node = node.parentNode;
    }
    return node;
}
function isDocument(node) {
    return node != null && node.nodeType == node.DOCUMENT_NODE
}
function getPage(url) {
    url = url || '';
    var hashIndex = url.indexOf('#!/'),
        hash = (hashIndex >= 0) ? url.slice(hashIndex + 3) : '';
    var searchIndex = hash.indexOf('?');
    /*,
     search = (searchIndex >= 0) ? hash.slice(searchIndex + 1) : '';*/
    var page = (searchIndex >= 0) ? hash.slice(0, searchIndex) : hash;
    return page;
}
function onhashchange(e) {
    if (!running) return;

    var oldCtx = parseURL(e.oldURL);
    var newCtx = parseURL(e.newURL);

    if (lastPage && oldCtx.page === newCtx.page) {
        lastPage.show(newCtx.state);
        return;
    }

    if (!lastPage && oldCtx.page) {
        var oldPage = document.getElementById('page-' + oldCtx.page);
        if (oldPage) {
            oldPage.style['display'] = 'none';
        }
    }
    changePage(newCtx.page, newCtx.state);
}
/**
 * 将URL解析成page和state
 * @param  {string} url 原始url地址
 * @return {object}    解析后的上下文，包括url、page、state三个属性
 */
function parseURL(url) {
    url = url || '';
    var decode = window.decodeURIComponent;
    var hashIndex = url.indexOf('#!/'),
        hash = (hashIndex >= 0) ? url.slice(hashIndex + 3) : '';
    var searchIndex = hash.indexOf('?'),
        search = (searchIndex >= 0) ? hash.slice(searchIndex + 1) : '';
    var page = (searchIndex >= 0) ? hash.slice(0, searchIndex) : hash;
    // Fragment shouldn't contain `&`, use `!!` instead
    // http://tools.ietf.org/html/rfc3986
    // @example #!/wallpaper?super=beauty!!sub=nude
    var pairs = search.split('!!'),
        state = {};
    for (var j = 0; j < pairs.length; j++) {
        var pair = pairs[j].replace(/\+/g, '%20'),
            i = pair.indexOf('='),
            key = ~i ? pair.slice(0, i) : pair,
            value = ~i ? pair.slice(i + 1) : '';
        try {
            key = decode(key);
            value = decode(value);
        } catch (e) {
            console.log(e);
        }
        state[key] = value;
    }
    return {
        'url': url,
        'page': page,
        'state': state
    };
}
/**
 * 切换页面
 * @param {string} page  页面名称
 * @param {object} state 状态兑对象
 */
function changePage(page, state) {
    if (page === '') {
        showDefaultPage();
        return;
    }
    require.async('page/' + page, function (newPage) {
        if (newPage) {
            if (lastPage && lastPage.hide) {
                lastPage.hide();
            }
            if (newPage.show) {
                newPage.show(state);
            }
            lastPage = newPage;
        } else {
            showDefaultPage();
        }
    });
}