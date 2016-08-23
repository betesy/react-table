import React, { PropTypes } from 'react';
import shallowequal from 'shallowequal';
import TableCell from './TableCell';
import ExpandIcon from './ExpandIcon';

const TableRow = React.createClass({
  propTypes: {
    onDestroy: PropTypes.func,    //销毁事件
    onRowClick: PropTypes.func,   //行点击事件
    record: PropTypes.object,     //单行数据
    prefixCls: PropTypes.string,  //前缀(默认rc-table)
    expandIconColumnIndex: PropTypes.number,  //展开行行号
    onHover: PropTypes.func,                  //鼠标悬浮行事件
    columns: PropTypes.array,                 //列数据
    style: PropTypes.object,                  //行样式
    visible: PropTypes.bool,                  //是否可见
    index: PropTypes.number,                  //行索引
    hoverKey: PropTypes.any,                  //行key
    expanded: PropTypes.bool,                 //是否展开
    expandable: PropTypes.any,                //是否可以展开(判断children与expandedRowRender)
    onExpand: PropTypes.func,                 //展开事件
    needIndentSpaced: PropTypes.bool,         //如果展开条件为false,是否需要占位
    className: PropTypes.string,              //需要外部传递rowClassName动态计算行样式
    indent: PropTypes.number,                 //层级
    indentSize: PropTypes.number,             //每层宽度
    expandIconAsCell: PropTypes.bool,         //展开图标单独渲染成单元格
    expandRowByClick: PropTypes.bool,         //单击行展开行
  },

  getDefaultProps() {
    return {
      onRowClick() {},
      onDestroy() {},
      expandIconColumnIndex: 0,
      expandRowByClick: false,
      onHover() {},
    };
  },

  shouldComponentUpdate(nextProps) {
    return !shallowequal(nextProps, this.props);    //如果两次传递数据不一致,更新
  },

  componentWillUnmount() {                          //销毁行函数,移除点击等事件
    this.props.onDestroy(this.props.record);
  },

  onRowClick(event) {
    const {
      record,
      index,
      onRowClick,
      expandable,
      expandRowByClick,
      expanded,
      onExpand,
   } = this.props;

    if (expandable && expandRowByClick) {     //如果行可以展开且单击行可以展开,调用传递过来的onExpand函数
      onExpand(!expanded, record);
    }
    onRowClick(record, index, event);
  },

  /*
  * 鼠标进入事件调用onHover
  * */
  onMouseEnter() {
    const { onHover, hoverKey } = this.props;
    onHover(true, hoverKey);
  },

  /*
   * 鼠标离开事件调用onHover
   * */
  onMouseLeave() {
    const { onHover, hoverKey } = this.props;
    onHover(false, hoverKey);
  },

  render() {
    const {
      prefixCls, columns, record, style, visible, index,
      expandIconColumnIndex, expandIconAsCell, expanded, expandRowByClick,
      expandable, onExpand, needIndentSpaced, className, indent, indentSize,
    } = this.props;

    const cells = [];

    for (let i = 0; i < columns.length; i++) {
      if (expandIconAsCell && i === 0) {  //如果展开图标单独渲染成单元格
        cells.push(
          <td
            className={`${prefixCls}-expand-icon-cell`}
            key="rc-table-expand-icon-cell"
          >
            <ExpandIcon
              expandable={expandable}
              prefixCls={prefixCls}
              onExpand={onExpand}
              needIndentSpaced={needIndentSpaced}
              expanded={expanded}
              record={record}
            />
          </td>
        );
      }

      //如果展开按钮单独渲染成单元格或者单击行展开,不绘制展开按钮
      const isColumnHaveExpandIcon = (expandIconAsCell || expandRowByClick)
        ? false : (i === expandIconColumnIndex);
      cells.push(
        <TableCell
          prefixCls={prefixCls}
          record={record}
          indentSize={indentSize}
          indent={indent}
          index={index}
          expandable={expandable}
          onExpand={onExpand}
          needIndentSpaced={needIndentSpaced}
          expanded={expanded}
          isColumnHaveExpandIcon={isColumnHaveExpandIcon}
          column={columns[i]}
          key={columns[i].key}
        />
      );
    }

    return (
      <tr
        onClick={this.onRowClick}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
        className={`${prefixCls} ${className} ${prefixCls}-level-${indent}`}
        style={visible ? style : { ...style, display: 'none' }}
      >
        {cells}
      </tr>
    );
  },
});

export default TableRow;
