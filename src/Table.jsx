import React, { PropTypes } from 'react';
import TableRow from './TableRow';
import { measureScrollbar, debounce } from './utils';
import shallowequal from 'shallowequal';
import addEventListener from 'rc-util/lib/Dom/addEventListener';

const Table = React.createClass({
  propTypes: {
    data: PropTypes.array,                                //表格数据
    expandIconAsCell: PropTypes.bool,                     //是否把展开按钮当成列渲染
    defaultExpandAllRows: PropTypes.bool,                 //默认是否展开所有行
    expandedRowKeys: PropTypes.array,                     //展开行的key
    defaultExpandedRowKeys: PropTypes.array,              //默认展开行的key
    useFixedHeader: PropTypes.bool,                       //是否固定表头
    columns: PropTypes.array,                             //表头配置
    prefixCls: PropTypes.string,                          //样式
    bodyStyle: PropTypes.object,                          //表格体样式
    style: PropTypes.object,                              //表格最外层样式
    rowKey: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
    rowClassName: PropTypes.func,
    expandedRowClassName: PropTypes.func,
    childrenColumnName: PropTypes.string,
    onExpand: PropTypes.func,
    onExpandedRowsChange: PropTypes.func,
    indentSize: PropTypes.number,
    onRowClick: PropTypes.func,
    columnsPageRange: PropTypes.array,
    columnsPageSize: PropTypes.number,
    expandIconColumnIndex: PropTypes.number,
    showHeader: PropTypes.bool,
    title: PropTypes.func,
    footer: PropTypes.func,
    scroll: PropTypes.object,
    rowRef: PropTypes.func,
    getBodyWrapper: PropTypes.func,
  },

  getDefaultProps() {
    return {
      data: [],
      useFixedHeader: false,
      expandIconAsCell: false,
      columns: [],
      defaultExpandAllRows: false,
      defaultExpandedRowKeys: [],
      rowKey: 'key',
      rowClassName() {
        return '';
      },
      expandedRowClassName() {
        return '';
      },
      onExpand() {
      },
      onExpandedRowsChange() {
      },
      prefixCls: 'rc-table',
      bodyStyle: {},
      style: {},
      childrenColumnName: 'children',
      indentSize: 15,
      columnsPageSize: 5,
      expandIconColumnIndex: 0,
      showHeader: true,
      scroll: {},
      rowRef() {
        return null;
      },
      getBodyWrapper: body => body,
    };
  },

  getInitialState() {
    const props = this.props;
    let expandedRowKeys = [];
    let rows = [...props.data];

    if (props.defaultExpandAllRows) {               //初始化展开行key,如果默认展开所有,则展开所有key的行
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        expandedRowKeys.push(this.getRowKey(row));
        rows = rows.concat(row[props.childrenColumnName] || []);
      }
    } else {                                        //否则展开传入行或者空展开
      expandedRowKeys = props.expandedRowKeys || props.defaultExpandedRowKeys;
    }


    return {
      expandedRowKeys,
      data: props.data,
      currentColumnsPage: 0,
      currentHoverKey: null,
      scrollPosition: 'left',
      fixedColumnsHeadRowsHeight: [],
      fixedColumnsBodyRowsHeight: [],
    };
  },

  componentDidMount() {
    this.resetScrollY();        //表格头部和表格体滚动到左侧
    this.syncFixedTableRowHeight();
    const isAnyColumnsFixed = this.isAnyColumnsFixed(); //如果有固定列
    if (isAnyColumnsFixed) {
      this.resizeEvent = addEventListener(    //窗体缩放时候,重置表格大小
        window, 'resize', debounce(this.syncFixedTableRowHeight, 150)
      );
    }
  },

  componentWillReceiveProps(nextProps) {
    if ('data' in nextProps) {
      this.setState({               //如果数据改变时,重置表格表体高度
        data: nextProps.data,
      });
      if (!nextProps.data || nextProps.data.length === 0) {
        this.resetScrollY();
      }
    }
    if ('expandedRowKeys' in nextProps) {           //重置展开行key
      this.setState({
        expandedRowKeys: nextProps.expandedRowKeys,
      });
    }
    if (nextProps.columns !== this.props.columns) {   //删除缓存
      delete this.isAnyColumnsFixedCache;
      delete this.isAnyColumnsLeftFixedCache;
      delete this.isAnyColumnsRightFixedCache;
    }
  },

  componentDidUpdate() {                    //每次组件改变时候,重置表头表体行高
    this.syncFixedTableRowHeight();
  },


  componentWillUnmount() {                  //组件卸载时候,卸载window重置事件
    clearTimeout(this.timer);
    if (this.resizeEvent) {
      this.resizeEvent.remove();
    }
  },

  /*
  * 展开状态变化事件
  * */
  onExpandedRowsChange(expandedRowKeys) {
    if (!this.props.expandedRowKeys) {          //设置state
      this.setState({ expandedRowKeys });
    }
    this.props.onExpandedRowsChange(expandedRowKeys); //调用传递的事件
  },

  /*
  * 展开收起事件
  * */
  onExpanded(expanded, record, e) {
    if (e) {//阻止冒泡与默认,防止调用行单击等其他事件
      e.preventDefault();
      e.stopPropagation();
    }
    const info = this.findExpandedRow(record);
    if (typeof info !== 'undefined' && !expanded) { //收起时,调用行销毁函数
      this.onRowDestroy(record);
    } else if (!info && expanded) {                 //展开时,调用展开状态变化事件
      const expandedRows = this.getExpandedRows().concat();
      expandedRows.push(this.getRowKey(record));
      this.onExpandedRowsChange(expandedRows);
    }
    this.props.onExpand(expanded, record);    //调用传递事件
  },

  /*
  * 行销毁函数
  * */
  onRowDestroy(record) {
    const expandedRows = this.getExpandedRows().concat();
    const rowKey = this.getRowKey(record);
    let index = -1;
    expandedRows.forEach((r, i) => {
      if (r === rowKey) {
        index = i;
      }
    });
    if (index !== -1) {
      expandedRows.splice(index, 1);    //行销毁后移除状态
    }
    this.onExpandedRowsChange(expandedRows);
  },

  /*
  * 获得行key
  * */
  getRowKey(record, index) {                    //获得行key
    const rowKey = this.props.rowKey;           //如果传入rowKey函数,
    if (typeof rowKey === 'function') {
      return rowKey(record, index);
    }
    //如果没有传入rowKey,取默认rowKey='key'的的数据字段值,如果没取到,以index当做rowKey值
    return typeof record[rowKey] !== 'undefined' ? record[rowKey] : index;
  },

  /*
  * 获得展开行的keys,随着展开/收起而变化
  * */
  getExpandedRows() {
    return this.props.expandedRowKeys || this.state.expandedRowKeys;
  },

  /*
  * 绘制表头
  * */
  getHeader(columns, fixed) {
    const { showHeader, expandIconAsCell, prefixCls } = this.props;
    let ths = [];

    //绘制展开列头
    if (expandIconAsCell && fixed !== 'right') {
      ths.push({
        key: 'rc-table-expandIconAsCell',
        className: `${prefixCls}-expand-icon-th`,
        title: '',
      });
    }

    //绘制表头
    ths = ths.concat(columns || this.getCurrentColumns()).map(c => {
      if (c.colSpan !== 0) {
        return <th key={c.key} colSpan={c.colSpan} className={c.className || ''}>{c.title}</th>;
      }
    });

    const { fixedColumnsHeadRowsHeight } = this.state;

    //设置单元格高度
    const trStyle = (fixedColumnsHeadRowsHeight[0] && columns) ? {
      height: fixedColumnsHeadRowsHeight[0],
    } : null;

    //如果展示表头,则绘制表头
    return showHeader ? (
      <thead className={`${prefixCls}-thead`} >
        <tr style={trStyle}>{ths}</tr>
      </thead>
    ) : null;
  },

  /*
  * 获得展开行
  * */
  getExpandedRow(key, content, visible, className, fixed) {
    const prefixCls = this.props.prefixCls;
    return (
      <tr
        key={`${key}-extra-row`}
        style={{ display: visible ? '' : 'none' }}
        className={`${prefixCls}-expanded-row ${className}`}
      >
        {(this.props.expandIconAsCell && fixed !== 'right')
           ? <td key="rc-table-expand-icon-placeholder" />
           : null}
        <td colSpan={this.props.columns.length}>
          {fixed !== 'right' ? content : '&nbsp;'}
        </td>
      </tr>
    );
  },

  getRowsByData(data, visible, indent, columns, fixed) {
    const props = this.props;
    const childrenColumnName = props.childrenColumnName;        //默认获得children
    const expandedRowRender = props.expandedRowRender;
    const expandRowByClick = props.expandRowByClick;
    const { fixedColumnsBodyRowsHeight } = this.state;
    let rst = [];
    const rowClassName = props.rowClassName;
    const rowRef = props.rowRef;
    const expandedRowClassName = props.expandedRowClassName;
    const needIndentSpaced = props.data.some(record => record[childrenColumnName]);
    const onRowClick = props.onRowClick;
    const isAnyColumnsFixed = this.isAnyColumnsFixed();

    const expandIconAsCell = fixed !== 'right' ? props.expandIconAsCell : false;
    const expandIconColumnIndex = fixed !== 'right' ? props.expandIconColumnIndex : -1;

    for (let i = 0; i < data.length; i++) {
      const record = data[i];                   //每行记录
      const key = this.getRowKey(record, i);    //记录key
      const childrenColumn = record[childrenColumnName];        //子项
      const isRowExpanded = this.isRowExpanded(record);         //判断该行是否应该展开
      let expandedRowContent;
      if (expandedRowRender && isRowExpanded) {                 //如果绘制展开函数且该行处于展开状态下,调用展开函数
        expandedRowContent = expandedRowRender(record, i);
      }
      let className = rowClassName(record, i);
      if (this.state.currentHoverKey === key) {                 //如果当前行鼠标悬浮,设置样式
        className += ` ${props.prefixCls}-row-hover`;
      }

      const onHoverProps = {};
      if (isAnyColumnsFixed) {    //传递onHover事件
        onHoverProps.onHover = this.handleRowHover;
      }

      const style = (fixed && fixedColumnsBodyRowsHeight[i]) ? {  //设置行高度
        height: fixedColumnsBodyRowsHeight[i],
      } : {};

      rst.push(
        <TableRow
          indent={indent}
          indentSize={props.indentSize}
          needIndentSpaced={needIndentSpaced}
          className={className}
          record={record}
          expandIconAsCell={expandIconAsCell}
          onDestroy={this.onRowDestroy}
          index={i}
          visible={visible}
          expandRowByClick={expandRowByClick}
          onExpand={this.onExpanded}
          expandable={childrenColumn || expandedRowRender}
          expanded={isRowExpanded}
          prefixCls={`${props.prefixCls}-row`}
          childrenColumnName={childrenColumnName}
          columns={columns || this.getCurrentColumns()}
          expandIconColumnIndex={expandIconColumnIndex}
          onRowClick={onRowClick}
          style={style}
          {...onHoverProps}
          key={key}
          hoverKey={key}
          ref={rowRef(record, i)}
        />
      );

      const subVisible = visible && isRowExpanded;

      if (expandedRowContent && isRowExpanded) {    //如果有展开的内容,则插入展开内容行
        rst.push(this.getExpandedRow(
          key, expandedRowContent, subVisible, expandedRowClassName(record, i), fixed
        ));
      }
      if (childrenColumn) {                         //如果有children,获得子项渲染
        rst = rst.concat(this.getRowsByData(
          childrenColumn, subVisible, indent + 1, columns, fixed
        ));
      }
    }
    return rst;
  },

  /*
  * 渲染行
  * */
  getRows(columns, fixed) {
    return this.getRowsByData(this.state.data, true, 0, columns, fixed);
  },

  /*
  * 控制单元格宽度,如果有展开fixed,则单独插入一列
  * */
  getColGroup(columns, fixed) {
    let cols = [];
    if (this.props.expandIconAsCell && fixed !== 'right') {
      cols.push(
        <col
          className={`${this.props.prefixCls}-expand-icon-col`}
          key="rc-table-expand-icon-col"
        />
      );
    }
    cols = cols.concat((columns || this.props.columns).map(c => {
      return <col key={c.key} style={{ width: c.width, minWidth: c.width }} />;
    }));
    return <colgroup>{cols}</colgroup>;
  },

  /*获得当前展示列*/
  getCurrentColumns() {
    const { columns, columnsPageRange, columnsPageSize, prefixCls } = this.props;
    const { currentColumnsPage } = this.state;
    if (!columnsPageRange || columnsPageRange[0] > columnsPageRange[1]) { //如果没有传递列范围或者传递错误
      return columns;
    }
    return columns.map((column, i) => {       //重新计算所有列样式
      let newColumn = { ...column };
      if (i >= columnsPageRange[0] && i <= columnsPageRange[1]) {
        const pageIndexStart = columnsPageRange[0] + currentColumnsPage * columnsPageSize;
        let pageIndexEnd = columnsPageRange[0] + (currentColumnsPage + 1) * columnsPageSize - 1;
        if (pageIndexEnd > columnsPageRange[1]) {
          pageIndexEnd = columnsPageRange[1];
        }
        if (i < pageIndexStart || i > pageIndexEnd) {
          newColumn.className = newColumn.className || '';
          newColumn.className += ` ${prefixCls}-column-hidden`;
        }
        newColumn = this.wrapPageColumn(newColumn, (i === pageIndexStart), (i === pageIndexEnd));
      }
      return newColumn;
    });
  },

  /*
  * 渲染左侧固定列表格
  * */
  getLeftFixedTable() {
    const { columns } = this.props;
    const fixedColumns = columns.filter(
      column => column.fixed === 'left' || column.fixed === true
    );
    return this.getTable({
      columns: fixedColumns,
      fixed: 'left',
    });
  },

  /*
   * 渲染右侧固定列表格
   * */
  getRightFixedTable() {
    const { columns } = this.props;
    const fixedColumns = columns.filter(column => column.fixed === 'right');
    return this.getTable({
      columns: fixedColumns,
      fixed: 'right',
    });
  },

  /*
  * 渲染表格函数
  * */
  getTable(options = {}) {
    const { columns, fixed } = options;
    const { prefixCls, scroll = {}, getBodyWrapper } = this.props;
    let { useFixedHeader } = this.props;
    const bodyStyle = { ...this.props.bodyStyle };
    const headStyle = {};

    let tableClassName = '';
    if (scroll.x || columns) {        //处理scroll.x
      tableClassName = `${prefixCls}-fixed`;
      bodyStyle.overflowX = bodyStyle.overflowX || 'auto';
    }

    if (scroll.y) {                   //处理scroll.y
      // maxHeight will make fixed-Table scrolling not working
      // so we only set maxHeight to body-Table here
      if (fixed) {                    //如果固定列头,设置表体高度
        bodyStyle.height = bodyStyle.height || scroll.y;
      } else {
        bodyStyle.maxHeight = bodyStyle.maxHeight || scroll.y;
      }
      bodyStyle.overflowY = bodyStyle.overflowY || 'scroll';
      useFixedHeader = true;

      // Add negative margin bottom for scroll bar overflow bug
      const scrollbarWidth = measureScrollbar();  //设置滚动条宽度
      if (scrollbarWidth > 0) {
        (fixed ? bodyStyle : headStyle).marginBottom = `-${scrollbarWidth}px`;
        (fixed ? bodyStyle : headStyle).paddingBottom = '0px';
      }
    }


    //绘制表格
    const renderTable = (hasHead = true, hasBody = true) => {
      const tableStyle = {};
      if (!columns && scroll.x) {
        // not set width, then use content fixed width
        if (scroll.x === true) {
          tableStyle.tableLayout = 'fixed';
        } else {
          tableStyle.width = scroll.x;
        }
      }
      const tableBody = hasBody ? getBodyWrapper(
        <tbody className={`${prefixCls}-tbody`}>
          {this.getRows(columns, fixed)}
        </tbody>
      ) : null;
      return (
        <table className={tableClassName} style={tableStyle}>
          {this.getColGroup(columns, fixed)}
          {hasHead ? this.getHeader(columns, fixed) : null}
          {tableBody}
        </table>
      );
    };

    let headTable;

    if (useFixedHeader) {   //如果固定表头,单独渲染表头表格
      headTable = (
        <div
          className={`${prefixCls}-header`}
          ref={columns ? null : 'headTable'}
          style={headStyle}
          onMouseOver={this.detectScrollTarget}
          onTouchStart={this.detectScrollTarget}
          onScroll={this.handleBodyScroll}
        >
          {renderTable(true, false)}
        </div>
      );
    }

    let BodyTable = (     //如果不是固定表格,渲染表格
      <div
        className={`${prefixCls}-body`}
        style={bodyStyle}
        ref="bodyTable"
        onMouseOver={this.detectScrollTarget}
        onTouchStart={this.detectScrollTarget}
        onScroll={this.handleBodyScroll}
      >
        {renderTable(!useFixedHeader)}
      </div>
    );


    if (columns && columns.length) {      //如果左右固定表头,绘制左右两侧表格,取消滚动
      let refName;
      if (columns[0].fixed === 'left' || columns[0].fixed === true) {
        refName = 'fixedColumnsBodyLeft';
      } else if (columns[0].fixed === 'right') {
        refName = 'fixedColumnsBodyRight';
      }
      delete bodyStyle.overflowX;
      delete bodyStyle.overflowY;
      BodyTable = (
        <div
          className={`${prefixCls}-body-outer`}
          style={{ ...bodyStyle }}
        >
          <div
            className={`${prefixCls}-body-inner`}
            ref={refName}
            onMouseOver={this.detectScrollTarget}
            onTouchStart={this.detectScrollTarget}
            onScroll={this.handleBodyScroll}
          >
            {renderTable(!useFixedHeader)}
          </div>
        </div>
      );
    }

    return <span>{headTable}{BodyTable}</span>;
  },

  /*
  * 表格头部,需要传入tilte函数
  * */
  getTitle() {
    const { title, prefixCls } = this.props;
    return title ? (
      <div className={`${prefixCls}-title`}>
        {title(this.state.data)}
      </div>
    ) : null;
  },

  /*
   * 表格头部,需要传入fotter函数
   * */
  getFooter() {
    const { footer, prefixCls } = this.props;
    return footer ? (
      <div className={`${prefixCls}-footer`}>
        {footer(this.state.data)}
      </div>
    ) : null;
  },

  //获得最大滚动页
  getMaxColumnsPage() {
    const { columnsPageRange, columnsPageSize } = this.props;
    return Math.ceil((columnsPageRange[1] - columnsPageRange[0] + 1) / columnsPageSize) - 1;
  },

  //设置滚动页状态
  goToColumnsPage(currentColumnsPage) {
    const maxColumnsPage = this.getMaxColumnsPage();
    let page = currentColumnsPage;
    if (page < 0) {
      page = 0;
    }
    if (page > maxColumnsPage) {
      page = maxColumnsPage;
    }

    this.setState({
      currentColumnsPage: page,
    });
  },

  /*
  * 获得表头表体高度
  * */
  syncFixedTableRowHeight() {
    const { prefixCls } = this.props;
    const headRows = this.refs.headTable ? this.refs.headTable.querySelectorAll(`tr`) : [];
    const bodyRows = this.refs.bodyTable.querySelectorAll(`.${prefixCls}-row`) || [];
    const fixedColumnsHeadRowsHeight = [].map.call(
      headRows, row => row.getBoundingClientRect().height || 'auto'
    );
    const fixedColumnsBodyRowsHeight = [].map.call(
      bodyRows, row => row.getBoundingClientRect().height || 'auto'
    );

    if (shallowequal(this.state.fixedColumnsHeadRowsHeight, fixedColumnsHeadRowsHeight) &&
        shallowequal(this.state.fixedColumnsBodyRowsHeight, fixedColumnsBodyRowsHeight)) {
      return;
    }

    this.timer = setTimeout(() => {
      this.setState({
        fixedColumnsHeadRowsHeight,     //获得表头高度
        fixedColumnsBodyRowsHeight,     //获得表体单元格高度
      });
    });
  },

  /*
  * 重置表格位置
  * */
  resetScrollY() {
    if (this.refs.headTable) {
      this.refs.headTable.scrollLeft = 0;
    }
    if (this.refs.bodyTable) {
      this.refs.bodyTable.scrollLeft = 0;
    }
  },

  /*
  * 获得前一个滚动页
  * */
  prevColumnsPage() {
    this.goToColumnsPage(this.state.currentColumnsPage - 1);
  },

  /*
  * 获得下一个滚动页
  * */
  nextColumnsPage() {
    this.goToColumnsPage(this.state.currentColumnsPage + 1);
  },

  /*
  * 重新包装列头,设置左右滚动按钮
  * */
  wrapPageColumn(column, hasPrev, hasNext) {
    const { prefixCls } = this.props;
    const { currentColumnsPage } = this.state;
    const maxColumnsPage = this.getMaxColumnsPage();
    let prevHandlerCls = `${prefixCls}-prev-columns-page`;
    if (currentColumnsPage === 0) {
      prevHandlerCls += ` ${prefixCls}-prev-columns-page-disabled`;
    }
    const prevHandler = <span className={prevHandlerCls} onClick={this.prevColumnsPage}></span>;
    let nextHandlerCls = `${prefixCls}-next-columns-page`;
    if (currentColumnsPage === maxColumnsPage) {
      nextHandlerCls += ` ${prefixCls}-next-columns-page-disabled`;
    }
    const nextHandler = <span className={nextHandlerCls} onClick={this.nextColumnsPage}></span>;
    if (hasPrev) {
      column.title = <span>{prevHandler}{column.title}</span>;
      column.className = `${column.className || ''} ${prefixCls}-column-has-prev`;
    }
    if (hasNext) {
      column.title = <span>{column.title}{nextHandler}</span>;
      column.className = `${column.className || ''} ${prefixCls}-column-has-next`;
    }
    return column;
  },

  //获得展开行
  findExpandedRow(record) {
    //获得展开行的keys
    const rows = this.getExpandedRows().filter(i => i === this.getRowKey(record));
    return rows[0];
  },

  //判断这行是否应该展开
  isRowExpanded(record) {
    return typeof this.findExpandedRow(record) !== 'undefined';
  },

  /*
  * 设置this.scrollTarget,处理滑动表体事件使用
  * */
  detectScrollTarget(e) {
    if (this.scrollTarget !== e.currentTarget) {
      this.scrollTarget = e.currentTarget;
    }
  },

  //单例获取固定列
  isAnyColumnsFixed() {
    if ('isAnyColumnsFixedCache' in this) {
      return this.isAnyColumnsFixedCache;
    }
    this.isAnyColumnsFixedCache = this.getCurrentColumns().some(column => !!column.fixed);

    return this.isAnyColumnsFixedCache;
  },


  //左侧固定列
  isAnyColumnsLeftFixed() {
    if ('isAnyColumnsLeftFixedCache' in this) {
      return this.isAnyColumnsLeftFixedCache;
    }
    this.isAnyColumnsLeftFixedCache = this.getCurrentColumns().some(
      column => column.fixed === 'left' || column.fixed === true
    );
    return this.isAnyColumnsLeftFixedCache;
  },

  //右侧固定列
  isAnyColumnsRightFixed() {
    if ('isAnyColumnsRightFixedCache' in this) {
      return this.isAnyColumnsRightFixedCache;
    }
    this.isAnyColumnsRightFixedCache = this.getCurrentColumns().some(
      column => column.fixed === 'right'
    );
    return this.isAnyColumnsRightFixedCache;
  },

  /*
   * 处理滑动表体事件
   * */
  handleBodyScroll(e) {
    // Prevent scrollTop setter trigger onScroll event
    // http://stackoverflow.com/q/1386696
    if (e.target !== this.scrollTarget) {
      return;
    }
    const { scroll = {} } = this.props;
    const { headTable, bodyTable, fixedColumnsBodyLeft, fixedColumnsBodyRight } = this.refs;
    if (scroll.x) {
      if (e.target === bodyTable && headTable) {
        headTable.scrollLeft = e.target.scrollLeft;
      } else if (e.target === headTable && bodyTable) {
        bodyTable.scrollLeft = e.target.scrollLeft;
      }
      if (e.target.scrollLeft === 0) {
        this.setState({ scrollPosition: 'left' });
      } else if (e.target.scrollLeft + 1 >=
        e.target.children[0].getBoundingClientRect().width -
        e.target.getBoundingClientRect().width) {
        this.setState({ scrollPosition: 'right' });
      } else if (this.state.scrollPosition !== 'middle') {
        this.setState({ scrollPosition: 'middle' });
      }
    }
    if (scroll.y) {
      if (fixedColumnsBodyLeft && e.target !== fixedColumnsBodyLeft) {
        fixedColumnsBodyLeft.scrollTop = e.target.scrollTop;
      }
      if (fixedColumnsBodyRight && e.target !== fixedColumnsBodyRight) {
        fixedColumnsBodyRight.scrollTop = e.target.scrollTop;
      }
      if (bodyTable && e.target !== bodyTable) {
        bodyTable.scrollTop = e.target.scrollTop;
      }
    }
  },

  /*
  * 添加设置当前滑动key状态
  * */
  handleRowHover(isHover, key) {
    this.setState({   //如果鼠标划入,isHover为true,否则为false,key:当前滑动行的key
      currentHoverKey: isHover ? key : null,
    });
  },

  render() {
    const props = this.props;
    const prefixCls = props.prefixCls;  //样式重置

    let className = props.prefixCls;    //叠加样式
    if (props.className) {
      className += ` ${props.className}`;
    }

    //columns index range need paging, like [2,10]. (Deprecated, use column.fixed)
    if (props.columnsPageRange) {  //需要滑动隐藏的列,样式:rc-table-column-hidden
      className += ` ${prefixCls}-columns-paging`;
    }
    if (props.useFixedHeader || (props.scroll && props.scroll.y)) {   //是否固定表头
      className += ` ${prefixCls}-fixed-header`;
    }
    className += ` ${prefixCls}-scroll-position-${this.state.scrollPosition}`;

    const isTableScroll = this.isAnyColumnsFixed() || props.scroll.x || props.scroll.y; //获得滚动列或者方向

    return (
      <div className={className} style={props.style}>
        {this.getTitle()}
        <div className={`${prefixCls}-content`}>
          {this.isAnyColumnsLeftFixed() &&  //渲染左侧固定表格
          <div className={`${prefixCls}-fixed-left`}>
            {this.getLeftFixedTable()}
          </div>}
          <div className={isTableScroll ? `${prefixCls}-scroll` : ''}>
            {this.getTable()}
            {this.getFooter()}
          </div>
          {this.isAnyColumnsRightFixed() && //渲染右侧固定表格
          <div className={`${prefixCls}-fixed-right`}>
            {this.getRightFixedTable()}
          </div>}
        </div>
      </div>
    );
  },
});

export default Table;
